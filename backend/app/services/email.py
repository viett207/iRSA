import logging
import secrets
from html import escape

from fastapi_mail import FastMail, MessageSchema, MessageType, ConnectionConfig

from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


def generate_verification_token() -> str:
    """Generate a secure random token for email verification."""
    return secrets.token_urlsafe(32)


# Lazy-load mail config to avoid validation errors when SMTP is not configured
_fm: FastMail | None = None


def _get_fastmail() -> FastMail | None:
    """Get FastMail instance, creating it lazily."""
    global _fm
    if _fm is not None:
        return _fm
    if not settings.SMTP_HOST or not settings.SMTP_USER:
        return None
    mail_config = ConnectionConfig(
        MAIL_USERNAME=settings.SMTP_USER,
        MAIL_PASSWORD=settings.SMTP_PASSWORD,
        MAIL_FROM=settings.SMTP_USER,  # Gmail requires From = SMTP user
        MAIL_FROM_NAME=settings.EMAIL_FROM_NAME,
        MAIL_PORT=settings.SMTP_PORT,
        MAIL_SERVER=settings.SMTP_HOST,
        MAIL_STARTTLS=True,
        MAIL_SSL_TLS=False,
        USE_CREDENTIALS=True,
        VALIDATE_CERTS=True,
    )
    _fm = FastMail(mail_config)
    return _fm


def _is_undeliverable_email(email: str) -> bool:
    """Check if email uses a non-routable domain (e.g. .local, .test)."""
    domain = email.rsplit("@", 1)[-1] if "@" in email else ""
    return domain.endswith((".local", ".test", ".example", ".localhost", ".invalid"))


async def send_email(
    to_email: str,
    subject: str,
    html_content: str,
    text_content: str | None = None,
) -> bool:
    """Send email via fastapi-mail (Gmail SMTP compatible)."""
    if not settings.SMTP_HOST or not settings.SMTP_USER:
        logger.warning("SMTP not configured, skipping email send")
        return False

    if _is_undeliverable_email(to_email):
        logger.warning(f"Skipping email to non-routable address: {to_email}")
        return False

    try:
        message = MessageSchema(
            subject=subject,
            recipients=[to_email],
            body=html_content,
            subtype=MessageType.html,
        )
        fm = _get_fastmail()
        if not fm:
            logger.warning("SMTP not configured, skipping email send")
            return False
        await fm.send_message(message)
        logger.info(f"Email sent successfully to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False


async def send_status_notification_email(
    email: str,
    full_name: str,
    job_title: str,
    status: str,
) -> bool:
    """Send application status change notification."""
    status_messages = {
        "reviewing": "đang được xem xét",
        "shortlisted": "đã được chọn vào danh sách ứng viên tiềm năng",
        "interviewing": "được mời phỏng vấn",
        "rejected": "không được chọn",
        "hired": "đã được tuyển dụng",
    }
    status_text = status_messages.get(status, escape(status))
    safe_name = escape(full_name)
    safe_job_title = escape(job_title)

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .status {{ font-weight: bold; color: #1890ff; }}
            .footer {{ margin-top: 30px; font-size: 12px; color: #666; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h2>Cập nhật trạng thái ứng tuyển</h2>
            <p>Xin chào {safe_name},</p>
            <p>Hồ sơ ứng tuyển của bạn cho vị trí <strong>{safe_job_title}</strong> đã <span class="status">{status_text}</span>.</p>
            <p>Vui lòng đăng nhập vào hệ thống để xem chi tiết.</p>
            <div class="footer">
                <p>© iRSA - Intelligent Resume Screening Automation</p>
            </div>
        </div>
    </body>
    </html>
    """

    return await send_email(
        to_email=email,
        subject=f"[iRSA] Cập nhật trạng thái ứng tuyển - {safe_job_title}",
        html_content=html_content,
    )


async def send_ai_evaluation_email(
    recruiter_email: str,
    recruiter_name: str,
    candidate_name: str,
    job_title: str,
    ai_result: dict,
) -> bool:
    """Send AI evaluation results to recruiter after Gemini analysis completes."""
    safe_recruiter = escape(recruiter_name)
    safe_candidate = escape(candidate_name)
    safe_job = escape(job_title)

    score = ai_result.get("overall_score", 0)
    recommendation = ai_result.get("recommendation", "N/A")
    assessment = escape(ai_result.get("overall_assessment", ""))

    rec_labels = {
        "STRONG_FIT": ("Rất phù hợp", "#52c41a"),
        "GOOD_FIT": ("Phù hợp", "#73d13d"),
        "PARTIAL_FIT": ("Phù hợp một phần", "#faad14"),
        "WEAK_FIT": ("Ít phù hợp", "#fa8c16"),
        "NOT_FIT": ("Không phù hợp", "#ff4d4f"),
    }
    rec_text, rec_color = rec_labels.get(recommendation, (recommendation, "#888"))

    # Build skills table rows
    skill_rows = ""
    for s in ai_result.get("skill_assessments", []):
        found_icon = "✅" if s.get("found") else "❌"
        skill_rows += f"""
        <tr>
            <td style="padding:6px 8px;border-bottom:1px solid #f0f0f0">{found_icon} {escape(s.get('skill',''))}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #f0f0f0">{s.get('confidence',0)}%</td>
            <td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;font-size:12px;color:#666">{escape(s.get('evidence',''))}</td>
        </tr>"""

    # Build strengths/concerns lists
    strengths_html = "".join(
        f"<li style='color:#52c41a'>{escape(s)}</li>"
        for s in ai_result.get("strengths", [])
    )
    concerns_html = "".join(
        f"<li style='color:#fa8c16'>{escape(c)}</li>"
        for c in ai_result.get("concerns", [])
    )

    # Build interview questions
    questions_html = ""
    for i, q in enumerate(ai_result.get("interview_questions", []), 1):
        cat_labels = {"technical": "Kỹ thuật", "behavioral": "Hành vi", "experience": "Kinh nghiệm"}
        cat = cat_labels.get(q.get("category", ""), q.get("category", ""))
        questions_html += f"""
        <tr>
            <td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;font-weight:600;width:30px">{i}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #f0f0f0">{escape(q.get('question',''))}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;font-size:12px;color:#888">{cat}</td>
        </tr>"""

    admin_url = f"{settings.FRONTEND_ADMIN_URL}/jobs/shortlisted"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 680px; margin: 0 auto; padding: 20px; }}
        .header {{ background: #f6ffed; border: 1px solid #b7eb8f; border-radius: 8px; padding: 16px; margin-bottom: 20px; }}
        .score-badge {{ display: inline-block; font-size: 28px; font-weight: bold; color: {rec_color}; }}
        .rec-badge {{ display: inline-block; padding: 4px 12px; background: {rec_color}; color: #fff; border-radius: 4px; font-size: 13px; }}
        table {{ width: 100%; border-collapse: collapse; }}
        th {{ text-align: left; padding: 8px; background: #fafafa; border-bottom: 2px solid #e8e8e8; font-size: 13px; }}
        .section-title {{ font-size: 15px; font-weight: 600; margin: 20px 0 8px; }}
        .btn {{ display: inline-block; padding: 10px 24px; background: #1890ff; color: #fff !important; text-decoration: none; border-radius: 6px; font-weight: bold; }}
        .footer {{ margin-top: 30px; font-size: 12px; color: #666; }}
    </style>
    </head>
    <body>
    <div class="container">
        <h2>Kết quả đánh giá AI</h2>
        <p>Xin chào {safe_recruiter},</p>
        <p>AI đã hoàn thành đánh giá ứng viên <strong>{safe_candidate}</strong> cho vị trí <strong>{safe_job}</strong>.</p>

        <div class="header">
            <span class="score-badge">{score}/100</span>
            &nbsp;&nbsp;
            <span class="rec-badge">{rec_text}</span>
            <p style="margin:8px 0 0;font-size:14px">{assessment}</p>
        </div>

        <div class="section-title">Đánh giá kỹ năng</div>
        <table>
            <thead><tr><th>Kỹ năng</th><th>Độ tin cậy</th><th>Bằng chứng</th></tr></thead>
            <tbody>{skill_rows}</tbody>
        </table>

        <div style="display:flex;gap:20px;margin-top:16px">
            <div style="flex:1">
                <div class="section-title" style="color:#52c41a">Điểm mạnh</div>
                <ul style="padding-left:20px;margin:4px 0">{strengths_html or '<li style="color:#ccc">Không có</li>'}</ul>
            </div>
            <div style="flex:1">
                <div class="section-title" style="color:#fa8c16">Lưu ý</div>
                <ul style="padding-left:20px;margin:4px 0">{concerns_html or '<li style="color:#ccc">Không có</li>'}</ul>
            </div>
        </div>

        {"<div class='section-title'>Câu hỏi phỏng vấn gợi ý</div><table><thead><tr><th>#</th><th>Câu hỏi</th><th>Loại</th></tr></thead><tbody>" + questions_html + "</tbody></table>" if questions_html else ""}

        <p style="margin-top:24px;text-align:center">
            <a href="{admin_url}" class="btn">Xem chi tiết trên hệ thống</a>
        </p>

        <div class="footer">
            <p>&copy; iRSA - Intelligent Resume Screening Automation</p>
        </div>
    </div>
    </body>
    </html>
    """

    return await send_email(
        to_email=recruiter_email,
        subject=f"[iRSA] Kết quả AI - {safe_candidate} - {safe_job}",
        html_content=html_content,
    )


async def send_password_reset_email(email: str, full_name: str, token: str) -> bool:
    """Send password reset link to user."""
    safe_name = escape(full_name)
    reset_url = f"{settings.FRONTEND_PORTAL_URL}/reset-password?token={token}"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .btn {{
                display: inline-block; padding: 12px 32px;
                background: #ff4d4f; color: #fff !important;
                text-decoration: none; border-radius: 6px;
                font-weight: bold; margin: 20px 0;
            }}
            .footer {{ margin-top: 30px; font-size: 12px; color: #666; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h2>Đặt lại mật khẩu iRSA</h2>
            <p>Xin chào {safe_name},</p>
            <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Nhấn vào nút bên dưới để tạo mật khẩu mới:</p>
            <p style="text-align: center;">
                <a href="{reset_url}" class="btn">Đặt lại mật khẩu</a>
            </p>
            <p>Hoặc copy đường link sau vào trình duyệt:</p>
            <p style="word-break: break-all; color: #ff4d4f;">{reset_url}</p>
            <p>Link có hiệu lực trong 1 giờ.</p>
            <div class="footer">
                <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
                <p>&copy; iRSA - Intelligent Resume Screening Automation</p>
            </div>
        </div>
    </body>
    </html>
    """

    return await send_email(
        to_email=email,
        subject="[iRSA] Đặt lại mật khẩu",
        html_content=html_content,
    )


async def send_verification_email(email: str, full_name: str, token: str) -> bool:
    """Send email verification link to user."""
    safe_name = escape(full_name)
    verify_url = f"{settings.FRONTEND_PORTAL_URL}/verify-email?token={token}"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .btn {{
                display: inline-block; padding: 12px 32px;
                background: #1890ff; color: #fff !important;
                text-decoration: none; border-radius: 6px;
                font-weight: bold; margin: 20px 0;
            }}
            .footer {{ margin-top: 30px; font-size: 12px; color: #666; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h2>Xác thực tài khoản iRSA</h2>
            <p>Xin chào {safe_name},</p>
            <p>Cảm ơn bạn đã đăng ký tài khoản tại iRSA. Vui lòng nhấn vào nút bên dưới để xác thực email của bạn:</p>
            <p style="text-align: center;">
                <a href="{verify_url}" class="btn">Xác thực email</a>
            </p>
            <p>Hoặc copy đường link sau vào trình duyệt:</p>
            <p style="word-break: break-all; color: #1890ff;">{verify_url}</p>
            <p>Link xác thực có hiệu lực trong 24 giờ.</p>
            <div class="footer">
                <p>Nếu bạn không đăng ký tài khoản, vui lòng bỏ qua email này.</p>
                <p>&copy; iRSA - Intelligent Resume Screening Automation</p>
            </div>
        </div>
    </body>
    </html>
    """

    return await send_email(
        to_email=email,
        subject="[iRSA] Xác thực tài khoản của bạn",
        html_content=html_content,
    )


async def send_interview_notification_email(
    candidate_email: str,
    candidate_name: str,
    job_title: str,
    interview_date: str,
    interview_type: str,
    location: str | None,
    notes: str | None,
) -> bool:
    """Send interview schedule notification to candidate."""
    safe_name = escape(candidate_name)
    safe_job = escape(job_title)
    type_label = "Online" if interview_type == "online" else "Trực tiếp"
    safe_location = escape(location or "Sẽ được thông báo sau")
    safe_notes = escape(notes) if notes else ""

    # Format date for display
    from datetime import datetime as dt
    try:
        date_obj = dt.fromisoformat(interview_date.replace("Z", "+00:00"))
        formatted_date = date_obj.strftime("%d/%m/%Y lúc %H:%M")
    except Exception:
        formatted_date = interview_date

    location_html = f'<a href="{safe_location}" style="color:#1890ff">{safe_location}</a>' if interview_type == "online" and location else safe_location

    notes_html = f"""
    <tr>
        <td style="padding:10px 16px;font-weight:600;color:#555;width:140px">Ghi chú</td>
        <td style="padding:10px 16px">{safe_notes}</td>
    </tr>""" if safe_notes else ""

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: #e6f7ff; border: 1px solid #91d5ff; border-radius: 8px; padding: 16px; margin-bottom: 20px; text-align: center; }}
        .header h2 {{ color: #1890ff; margin: 0; }}
        table {{ width: 100%; border-collapse: collapse; margin: 16px 0; }}
        td {{ border-bottom: 1px solid #f0f0f0; }}
        .footer {{ margin-top: 30px; font-size: 12px; color: #666; text-align: center; }}
    </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2>📅 Thư mời phỏng vấn</h2>
            </div>
            <p>Xin chào <strong>{safe_name}</strong>,</p>
            <p>Chúng tôi vui mừng thông báo bạn đã được mời phỏng vấn cho vị trí <strong>{safe_job}</strong>.</p>

            <table>
                <tr>
                    <td style="padding:10px 16px;font-weight:600;color:#555;width:140px">Ngày giờ</td>
                    <td style="padding:10px 16px;font-weight:600;color:#1890ff">{formatted_date}</td>
                </tr>
                <tr>
                    <td style="padding:10px 16px;font-weight:600;color:#555">Hình thức</td>
                    <td style="padding:10px 16px">{type_label}</td>
                </tr>
                <tr>
                    <td style="padding:10px 16px;font-weight:600;color:#555">{"Link phỏng vấn" if interview_type == "online" else "Địa điểm"}</td>
                    <td style="padding:10px 16px">{location_html}</td>
                </tr>
                {notes_html}
            </table>

            <p>Vui lòng xác nhận tham dự và chuẩn bị đầy đủ trước buổi phỏng vấn.</p>
            <p>Chúc bạn buổi phỏng vấn thành công!</p>

            <div class="footer">
                <p>&copy; iRSA - Intelligent Resume Screening Automation</p>
            </div>
        </div>
    </body>
    </html>
    """

    return await send_email(
        to_email=candidate_email,
        subject=f"[iRSA] Thư mời phỏng vấn - {safe_job}",
        html_content=html_content,
    )
