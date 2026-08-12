import logging
import re  # Regular expression để tìm kiếm pattern trong text
from typing import Optional, Set, List, Dict, Any
from sqlalchemy import select
from sqlalchemy.orm import selectinload, Session  # ORM tools để query database

from app.models import Application, Job, JobCriteria, Resume
from app.models.scoring_result import ScoringResult
from app.services.vietnamese_nlp import get_nlp  # Service xử lý tiếng Việt

# Khởi tạo logger để ghi log debug/error
logger = logging.getLogger(__name__)

class ResumeScorer:
    """
    Class chính để tính điểm matching giữa CV và Job Requirements.
    Sử dụng 3 tiêu chí chính: Skills, Experience, Education
    """
    
    # Trọng số mặc định cho 3 tiêu chí (tổng = 1.0)
    # Skills chiếm 60%, Experience 30%, Education 10%
    DEFAULT_WEIGHTS = {
        "skills": 0.60,        # Kỹ năng là quan trọng nhất
        "experience": 0.30,    # Kinh nghiệm là quan trọng thứ 2
        "education": 0.10      # Học vấn là quan trọng thứ 3
    }

    # Định nghĩa cấp độ học vấn theo thứ tự tăng dần
    # Số càng cao = trình độ càng cao
    EDUCATION_LEVELS = {
        "high_school": 1,   # Trung học phổ thông
        "bachelor": 2,      # Cử nhân/Đại học
        "master": 3,        # Thạc sĩ
        "phd": 4,          # Tiến sĩ
    }

    # Từ khóa để nhận diện cấp độ học vấn trong CV
    # Hỗ trợ cả tiếng Việt và tiếng Anh
    EDUCATION_KEYWORDS = {
        "phd": ["tiến sĩ", "nghiên cứu sinh", "phd", "doctor"],
        "master": ["thạc sĩ", "cao học", "master", "mba"],
        "bachelor": ["cử nhân", "đại học", "kỹ sư", "bachelor", "university"],
        "high_school": ["trung học", "thpt", "phổ thông", "high school"],
    }

    # Các pattern regex để tìm số năm kinh nghiệm trong CV
    # (?<!\d) và (?!\d) là negative lookbehind/lookahead để tránh bắt nhầm
    # Ví dụ: "2025" sẽ không bị hiểu nhầm là "25 năm kinh nghiệm"
    EXPERIENCE_PATTERNS = [
        r"(?<!\d)(\d{1,2})(?!\d)\s*năm\s*(?:kinh nghiệm|kinh_nghiệm)",  # "5 năm kinh nghiệm"
        r"(?<!\d)(\d{1,2})(?!\d)\s*years?\s*(?:of\s*)?experience",      # "5 years experience"
        r"kinh\s*nghiệm\s*(?<!\d)(\d{1,2})(?!\d)\s*năm",                # "kinh nghiệm 5 năm"
        r"(?:trên|hơn|khoảng)\s*(?<!\d)(\d{1,2})(?!\d)\s*năm",         # "trên 5 năm"
        r"(?<!\d)(\d{1,2})(?!\d)\+?\s*năm\s*(?:làm việc|trong)",       # "5+ năm làm việc"
    ]

    # Giới hạn số năm kinh nghiệm hợp lệ (để loại bỏ false positive)
    MAX_VALID_EXPERIENCE = 50  # Không ai có 50+ năm kinh nghiệm thực tế

    # Alias map cho các kỹ năng mà underthesea tokenize sai (đặc biệt tin học văn phòng)
    # Key: tên skill (lowercase), Value: list các từ khóa tìm trong CV (lowercase)
    # Chỉ cần 1 trong các alias match là skill được tính
    SKILL_ALIASES = {
        # Microsoft Office suite
        "excel": ["excel", "ms excel", "microsoft excel"],
        "word": ["microsoft word", "ms word", " word "],
        "powerpoint": ["powerpoint", "power point", "ms powerpoint", "microsoft powerpoint"],
        "office": ["microsoft office", "ms office", "tin học văn phòng"],
        "outlook": ["outlook", "ms outlook", "microsoft outlook"],
        "access": ["ms access", "microsoft access"],
        # Google Workspace
        "google sheets": ["google sheets", "google sheet", "gg sheets"],
        "google docs": ["google docs", "google doc", "gg docs"],
        "google slides": ["google slides", "google slide"],
        # Kỹ năng văn phòng phổ biến
        "tin học văn phòng": ["tin học văn phòng", "office", "microsoft office", "ms office",
                              "excel", "word", "powerpoint"],
        "vlookup": ["vlookup", "v-lookup"],
        "pivot table": ["pivot table", "pivot_table", "pivottable", "bảng tổng hợp"],
        "vba": ["vba", "visual basic", "macro excel"],
    }

    @classmethod
    def score_application(cls, db: Session, application_id: int) -> Optional[ScoringResult]:
        """
        Entry point chính: Tính toán và lưu kết quả scoring cho 1 application.
        Dùng phương pháp kết hợp (keyword + embedding rescue).

        Args:
            db: Database session
            application_id: ID của đơn ứng tuyển cần tính điểm

        Returns:
            ScoringResult object hoặc None nếu không đủ dữ liệu
        """
        # ========== BƯỚC 1: Fetch dữ liệu ==========
        stmt = (
            select(Application)
            .options(
                selectinload(Application.resume),
                selectinload(Application.job).selectinload(Job.criteria),
            )
            .where(Application.id == application_id)
        )
        app = db.execute(stmt).scalar_one_or_none()

        if not app or not app.resume or not app.resume.raw_text:
            logger.warning(f"Application {application_id} missing text for scoring.")
            return None

        criteria = getattr(app.job, 'criteria', None)
        if not criteria:
            logger.warning(f"Job for Application {application_id} has no scoring criteria.")
            return None

        # ========== BƯỚC 2: Lấy resume text ==========
        resume_text = app.resume.raw_text
        must_have = criteria.must_have_skills or []
        nice_to_have = criteria.nice_to_have_skills or []

        # ========== BƯỚC 3: Tính điểm (keyword + embedding kết hợp) ==========
        skill_res = cls._score_skills_combined(resume_text, must_have, nice_to_have, criteria)
        exp_res = cls._score_experience(resume_text, criteria)
        edu_res = cls._score_education(resume_text, criteria)

        # ========== BƯỚC 4: Tính điểm tổng hợp (Weighted Average) ==========
        # Lấy trọng số từ criteria (hoặc dùng default nếu không có)
        weights = cls._get_weights(criteria)
        # Công thức: Total = (Skill * W1) + (Exp * W2) + (Edu * W3)
        # Ví dụ: (80 * 0.6) + (70 * 0.3) + (100 * 0.1) = 48 + 21 + 10 = 79
        total_score = (
            skill_res["score"] * weights["skills"] +
            exp_res["score"] * weights["experience"] +
            edu_res["score"] * weights["education"]
        )

        # ========== BƯỚC 5: Chuẩn bị dữ liệu để lưu vào database ==========
        score_data = {
            "application_id": application_id,
            "total_score": round(total_score, 1),  # Làm tròn 1 chữ số thập phân
            "skill_match_score": round(skill_res["score"], 1),
            "experience_score": round(exp_res["score"], 1),
            "education_score": round(edu_res["score"], 1),
            # match_details chứa toàn bộ chi tiết phân tích (JSON field)
            "match_details": {
                "skills": skill_res,        # Chi tiết skills matching
                "experience": exp_res,      # Chi tiết experience matching
                "education": edu_res,       # Chi tiết education matching
                "weights": {                # Trọng số đã sử dụng
                    "skills": weights["skills"],
                    "experience": weights["experience"],
                    "education": weights["education"],
                },
                "sections_found": ["full_text"],
            }
        }

        # ========== BƯỚC 6: Upsert vào database ==========
        # Tìm bản ghi cũ (nếu đã score application này rồi)
        result = db.execute(
            select(ScoringResult).where(ScoringResult.application_id == application_id)
        ).scalar_one_or_none()

        if result:
            # UPDATE: Đã có bản ghi => cập nhật các field
            for key, value in score_data.items():
                setattr(result, key, value)
        else:
            # INSERT: Chưa có bản ghi => tạo mới
            result = ScoringResult(**score_data)
            db.add(result)

        # Commit transaction và refresh object để có ID mới (nếu INSERT)
        db.commit()
        db.refresh(result)
        return result

    @classmethod
    def _get_weights(cls, criteria: Any) -> Dict[str, float]:
        """
        Lấy trọng số từ criteria, fallback về DEFAULT_WEIGHTS nếu không có.
        
        Normalize weights để tổng = 1.0 (phần trăm)
        Ví dụ: weight_skills=6, weight_experience=3, weight_education=1
        => Normalize: 6/10=0.6, 3/10=0.3, 1/10=0.1
        
        Args:
            criteria: JobCriteria object
            
        Returns:
            Dict với keys: skills, experience, education (tổng = 1.0)
        """
        # Lấy trọng số từ criteria (có thể là None)
        w_skills = getattr(criteria, "weight_skills", None)
        w_exp = getattr(criteria, "weight_experience", None)
        w_edu = getattr(criteria, "weight_education", None)
        
        # Nếu có đầy đủ 3 trọng số và hợp lệ => normalize
        if w_skills is not None and w_exp is not None and w_edu is not None:
            total = w_skills + w_exp + w_edu
            if total > 0:  # Tránh chia cho 0
                return {
                    "skills": w_skills / total,      # Ví dụ: 6/10 = 0.6
                    "experience": w_exp / total,      # 3/10 = 0.3
                    "education": w_edu / total,       # 1/10 = 0.1
                }
        # Fallback: Dùng trọng số mặc định
        return cls.DEFAULT_WEIGHTS

    @classmethod
    def _score_skills(cls, nlp, resume_keywords: Set[str], criteria: Any, resume_text: str = "") -> Dict:
        """
        Tính điểm kỹ năng dựa trên must-have và nice-to-have skills.
        
        Logic:
        - Must-have skills được tính trọng số x2
        - Nice-to-have skills được tính trọng số x1
        - Điểm = (matched_points / total_points) * 100
        
        Ví dụ:
        - Must-have: [Python, SQL, Docker] => 3 * 2 = 6 points
        - Nice-to-have: [AWS, Kubernetes] => 2 * 1 = 2 points
        - Total: 8 points
        - Nếu match Python, SQL, AWS => (2*2 + 1*1) / 8 * 100 = 62.5 điểm
        
        Args:
            nlp: NLP processor
            resume_keywords: Set keywords từ CV
            criteria: JobCriteria object
            
        Returns:
            Dict chứa score và chi tiết matching
        """
        # Lấy danh sách skills từ criteria
        must_have = criteria.must_have_skills or []     # Skills bắt buộc
        nice_to_have = criteria.nice_to_have_skills or []  # Skills không bắt buộc
        
        # Nếu không có skills yêu cầu => return 0 điểm
        if not must_have and not nice_to_have:
            return {
                "score": 0.0, 
                "matched_must": [],    # Danh sách must-have đã match
                "matched_nice": [],    # Danh sách nice-to-have đã match
                "missing_must": [],    # Danh sách must-have còn thiếu
                "missing_nice": [],    # Danh sách nice-to-have còn thiếu
                "match_sections": {},  # Map: skill -> section tìm thấy
                "search_section": "full_text",  # Section đã search
            }

        # Chuẩn bị text lowercase 1 lần cho alias matching
        text_lower = resume_text.lower() if resume_text else ""

        def is_match(skill: str) -> bool:
            """
            Kiểm tra skill có match với CV không.

            Ưu tiên 1: Tìm alias/exact match cho các skill dễ bị tokenize sai
            (Excel, Word, PowerPoint, Office, v.v.)

            Ưu tiên 2: Fallback NLP tokenization - yêu cầu khớp TOÀN BỘ tokens
            """
            skill_lower = skill.lower().strip()

            # Bước 1: Kiểm tra alias map (cho các skill tin học văn phòng)
            aliases = cls.SKILL_ALIASES.get(skill_lower)
            if aliases:
                # Chỉ cần 1 alias xuất hiện trong CV text là match
                for alias in aliases:
                    if alias in text_lower:
                        return True
                return False

            # Bước 2: Fallback - NLP tokenization matching
            skill_tokens = nlp.extract_keywords(skill)
            if not skill_tokens:
                return False
            return skill_tokens.issubset(resume_keywords)

        # Tìm các skills đã match và còn thiếu
        matched_must = [s for s in must_have if is_match(s)]
        matched_nice = [s for s in nice_to_have if is_match(s)]
        missing_must = [s for s in must_have if s not in matched_must]
        missing_nice = [s for s in nice_to_have if s not in matched_nice]

        # Tính điểm theo công thức weighted
        # Must-have weight = 2, Nice-to-have weight = 1
        total_weight = len(must_have) * 2 + len(nice_to_have)
        earned_points = len(matched_must) * 2 + len(matched_nice)
        # Score = phần trăm points đã đạt được
        score = (earned_points / total_weight * 100) if total_weight > 0 else 0

        # Build match_sections: map mỗi skill đã match tới section tìm thấy
        # Hiện tại đơn giản là "full_text", nhưng có thể mở rộng để scan từng section riêng
        match_sections = {s: "full_text" for s in matched_must + matched_nice}

        return {
            "score": score,
            "matched_must": matched_must,      # ["Python", "SQL"]
            "missing_must": missing_must,      # ["Docker"]
            "matched_nice": matched_nice,      # ["AWS"]
            "missing_nice": missing_nice,      # ["Kubernetes"]
            "match_sections": match_sections,  # {"Python": "full_text", "SQL": "full_text", ...}
            "search_section": "full_text",
        }

    @classmethod
    def _score_skills_combined(
        cls, resume_text: str, must_have: List[str], nice_to_have: List[str], criteria: Any
    ) -> Dict:
        """Kết hợp keyword + embedding: keyword match trước, embedding bổ sung phần miss.

        Flow:
        1. Chạy keyword matching (NLP + alias) → tìm matched & missing
        2. Với những skill keyword miss → chạy embedding similarity
        3. Nếu embedding tìm thấy (similarity >= threshold) → rescue skill đó
        4. Merge kết quả, ghi rõ skill match bằng phương pháp nào
        """
        # Bước 1: Keyword matching
        nlp = get_nlp()
        resume_keywords = nlp.extract_keywords(resume_text)
        kw_res = cls._score_skills(nlp, resume_keywords, criteria, resume_text)

        kw_missing_must = kw_res["missing_must"]
        kw_missing_nice = kw_res["missing_nice"]

        # Nếu keyword đã match hết → không cần embedding
        if not kw_missing_must and not kw_missing_nice:
            kw_res["search_section"] = "combined"
            kw_res["method_details"] = {"keyword_only": True}
            return kw_res

        # Bước 2: Embedding rescue cho các skill mà keyword miss
        # Gracefully fallback nếu embedding model không load được (network/model issue)
        try:
            from app.services.embedding_scorer import get_embedding_scorer
            emb_scorer = get_embedding_scorer()
            emb_res = emb_scorer.score_skills(resume_text, kw_missing_must, kw_missing_nice)
        except Exception as e:
            logger.warning(f"Embedding scorer unavailable, using keyword-only: {e}")
            kw_res["search_section"] = "keyword_only"
            kw_res["method_details"] = {"keyword_only": True, "embedding_error": str(e)}
            return kw_res

        # Bước 3: Merge kết quả
        # Skill match = keyword matched + embedding rescued
        final_matched_must = kw_res["matched_must"] + emb_res["matched_must"]
        final_matched_nice = kw_res["matched_nice"] + emb_res["matched_nice"]
        final_missing_must = emb_res["missing_must"]  # Cả 2 đều miss
        final_missing_nice = emb_res["missing_nice"]

        # Tính điểm
        total_weight = len(must_have) * 2 + len(nice_to_have)
        earned_points = len(final_matched_must) * 2 + len(final_matched_nice)
        score = (earned_points / total_weight * 100) if total_weight > 0 else 0

        # Ghi rõ mỗi skill match bằng cách nào
        match_sections = {}
        for s in kw_res["matched_must"] + kw_res["matched_nice"]:
            match_sections[s] = "keyword"
        for s in emb_res["matched_must"] + emb_res["matched_nice"]:
            match_sections[s] = "embedding"

        return {
            "score": score,
            "matched_must": final_matched_must,
            "missing_must": final_missing_must,
            "matched_nice": final_matched_nice,
            "missing_nice": final_missing_nice,
            "match_sections": match_sections,
            "search_section": "combined",
            "similarity_scores": emb_res.get("similarity_scores", {}),
            "method_details": {
                "keyword_matched": kw_res["matched_must"] + kw_res["matched_nice"],
                "embedding_rescued": emb_res["matched_must"] + emb_res["matched_nice"],
                "both_missed": final_missing_must + final_missing_nice,
            },
        }

    @classmethod
    def _score_experience(cls, text: str, criteria: Any) -> Dict:
        """
        Tính điểm kinh nghiệm dựa trên số năm tìm được trong CV.

        Logic:
        1. Scan CV để tìm tất cả các pattern số năm kinh nghiệm
        2. Lấy số năm cao nhất (max) làm detected_years
        3. So sánh với min_experience_years yêu cầu
        4. Tính điểm theo tỷ lệ tuyến tính (linear scoring)
        
        Ví dụ:
        - Yêu cầu: 4 năm
        - CV có: 2 năm
        - Score = (2/4) * 100 = 50 điểm
        
        - Yêu cầu: 4 năm  
        - CV có: 6 năm
        - Score = min((6/4) * 100, 100) = 100 điểm (cap ở 100)
        
        Args:
            text: Raw text của CV
            criteria: JobCriteria object
            
        Returns:
            Dict chứa score và chi tiết
        """
        # Lấy số năm kinh nghiệm tối thiểu yêu cầu
        min_req = criteria.min_experience_years or 0
        # Chuyển text sang lowercase để dễ match pattern
        text_lower = text.lower()
        
        # Scan text với tất cả patterns
        found_years = []  # Danh sách tất cả số năm tìm được
        for pattern in cls.EXPERIENCE_PATTERNS:
            # findall trả về list các match groups
            matches = re.findall(pattern, text_lower)
            for m in matches:
                # m là captured group (\d{1,2})
                if m.isdigit():  # Đảm bảo là số
                    y = int(m)
                    # Validate: năm phải hợp lý (1-49 năm)
                    # Loại bỏ false positive như "năm 2020" (y=20, hợp lệ nhưng cần cẩn thận)
                    if 0 < y < cls.MAX_VALID_EXPERIENCE:
                        found_years.append(y)
        
        # Lấy số năm cao nhất làm kinh nghiệm thực tế
        # Logic: người ta thường nói số năm tổng cộng, không phải từng công ty
        detected = max(found_years) if found_years else 0
        
        # Tính điểm
        if min_req == 0:
            # Không yêu cầu kinh nghiệm => luôn 100 điểm
            score = 100.0
        else:
            # Linear scoring: tỷ lệ giữa detected và required
            # Ví dụ: detected=2, min_req=4 => (2/4)*100 = 50
            # Ví dụ: detected=6, min_req=4 => min((6/4)*100, 100) = 100
            score = min((detected / min_req) * 100, 100.0)

        return {
            "score": score,
            "detected_years": detected,           # Số năm phát hiện được
            "required_min": min_req,              # Yêu cầu tối thiểu
            "required_max": criteria.max_experience_years,  # Yêu cầu tối đa (nếu có)
            "search_section": "full_text",
        }

    @classmethod
    def _score_education(cls, text: str, criteria: Any) -> Dict:
        """
        Tính điểm học vấn dựa trên cấp độ phát hiện được trong CV.
        
        Logic:
        1. Scan CV để tìm keywords của các cấp độ học vấn
        2. Lấy cấp độ cao nhất tìm được
        3. So sánh với cấp độ yêu cầu
        4. Tính điểm:
           - Đủ hoặc cao hơn yêu cầu => 100 điểm
           - Thấp hơn 1 bậc => 50 điểm
           - Thấp hơn 2+ bậc => 0 điểm
        
        Ví dụ:
        - Yêu cầu: Bachelor (2)
        - CV có: Master (3)
        - => 100 điểm (cao hơn yêu cầu)
        
        - Yêu cầu: Master (3)
        - CV có: Bachelor (2)
        - => 50 điểm (thấp hơn 1 bậc)
        
        - Yêu cầu: Master (3)
        - CV có: High School (1)
        - => 0 điểm (thấp hơn 2 bậc)
        
        Args:
            text: Raw text của CV
            criteria: JobCriteria object
            
        Returns:
            Dict chứa score và chi tiết
        """
        # Lấy cấp độ học vấn yêu cầu từ criteria
        req_level = criteria.min_education
        
        # Nếu không yêu cầu hoặc yêu cầu không hợp lệ => 100 điểm
        if not req_level or req_level not in cls.EDUCATION_LEVELS:
            return {
                "score": 100.0, 
                "detected_level": None,      # Không phát hiện cấp độ nào
                "required_level": None,      # Không có yêu cầu
                "search_section": "full_text",
            }

        # Chuyển text sang lowercase
        text_lower = text.lower()
        # Tracking cấp độ cao nhất tìm được
        best_rank = 0      # Rank cao nhất (0 = chưa tìm thấy gì)
        best_level = None  # Level tương ứng

        # Scan text với từng education level
        for level, keywords in cls.EDUCATION_KEYWORDS.items():
            # Kiểm tra có keyword nào của level này trong text không
            if any(kw in text_lower for kw in keywords):
                # Lấy rank của level này
                rank = cls.EDUCATION_LEVELS[level]
                # Cập nhật best nếu rank cao hơn
                if rank > best_rank:
                    best_rank, best_level = rank, level

        # Lấy rank yêu cầu
        req_rank = cls.EDUCATION_LEVELS[req_level]
        
        # Tính điểm dựa trên so sánh rank
        if best_rank >= req_rank:
            # Đủ hoặc cao hơn yêu cầu => 100 điểm
            # Ví dụ: Yêu cầu Bachelor(2), có Master(3) => 100
            score = 100.0
        elif best_rank == req_rank - 1:
            # Thấp hơn đúng 1 bậc => 50 điểm
            # Ví dụ: Yêu cầu Master(3), có Bachelor(2) => 50
            score = 50.0
        else:
            # Thấp hơn 2+ bậc hoặc không tìm thấy => 0 điểm
            # Ví dụ: Yêu cầu Master(3), có High School(1) => 0
            score = 0.0

        return {
            "score": score, 
            "detected_level": best_level,   # "bachelor", "master", etc.
            "required_level": req_level,    # "master", etc.
            "search_section": "full_text",
        }


# ========== Backward-compatible wrapper ==========
# Alias function để giữ tương thích với code cũ
# API layer có thể import `score_application_sync` thay vì `ResumeScorer.score_application`
def score_application_sync(db: Session, application_id: int):
    """Wrapper function để giữ tương thích ngược."""
    return ResumeScorer.score_application(db, application_id)
