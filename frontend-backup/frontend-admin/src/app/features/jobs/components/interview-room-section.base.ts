import type { InterviewRoomModalComponent } from './interview-room-modal.component';

/** Presentation adapter: the modal owns state/services; child sections own UI. */
export abstract class InterviewRoomSectionBase {
  abstract room: InterviewRoomModalComponent;

  get data() { return this.room.data; }
  get loading() { return this.room.loading; }
  get activeTabIndex() { return this.room.activeTabIndex; }
  set activeTabIndex(value) { this.room.activeTabIndex = value; }
  get allQuestionStates() { return this.room.allQuestionStates; }
  get activeQuestions() { return this.room.activeQuestions; }
  get overallScore() { return this.room.overallScore; }
  get overallFeedback() { return this.room.overallFeedback; }
  get recommendation() { return this.room.recommendation; }
  get summarizing() { return this.room.summarizing; }
  get interviewMode() { return this.room.interviewMode; }
  set interviewMode(value) { this.room.interviewMode = value; }
  get playingIndex() { return this.room.playingIndex; }
  get customModalVisible() { return this.room.customModalVisible; }
  set customModalVisible(value) { this.room.customModalVisible = value; }
  get newQuestion() { return this.room.newQuestion; }
  get aiGenModalVisible() { return this.room.aiGenModalVisible; }
  set aiGenModalVisible(value) { this.room.aiGenModalVisible = value; }
  get aiGenTopic() { return this.room.aiGenTopic; }
  set aiGenTopic(value) { this.room.aiGenTopic = value; }
  get aiGenCount() { return this.room.aiGenCount; }
  set aiGenCount(value) { this.room.aiGenCount = value; }
  get aiGenerating() { return this.room.aiGenerating; }
  get scoreFormat() { return this.room.scoreFormat; }
  get answeredCount() { return this.room.answeredCount; }
  get averageAnswerScore() { return this.room.averageAnswerScore; }

  isAnyRecording(...args: Parameters<InterviewRoomModalComponent['isAnyRecording']>) {
    return this.room.isAnyRecording(...args);
  }
  getAudioSrc(...args: Parameters<InterviewRoomModalComponent['getAudioSrc']>) {
    return this.room.getAudioSrc(...args);
  }
  togglePlayAudio(...args: Parameters<InterviewRoomModalComponent['togglePlayAudio']>) {
    return this.room.togglePlayAudio(...args);
  }
  startRecording(...args: Parameters<InterviewRoomModalComponent['startRecording']>) {
    return this.room.startRecording(...args);
  }
  stopRecording(...args: Parameters<InterviewRoomModalComponent['stopRecording']>) {
    return this.room.stopRecording(...args);
  }
  onFileSelected(...args: Parameters<InterviewRoomModalComponent['onFileSelected']>) {
    return this.room.onFileSelected(...args);
  }
  transcribeAudioOnly(...args: Parameters<InterviewRoomModalComponent['transcribeAudioOnly']>) {
    return this.room.transcribeAudioOnly(...args);
  }
  evaluateAnswer(...args: Parameters<InterviewRoomModalComponent['evaluateAnswer']>) {
    return this.room.evaluateAnswer(...args);
  }
  triggerSummary(...args: Parameters<InterviewRoomModalComponent['triggerSummary']>) {
    return this.room.triggerSummary(...args);
  }
  saveQuestions(...args: Parameters<InterviewRoomModalComponent['saveQuestions']>) {
    return this.room.saveQuestions(...args);
  }
  openAddCustomModal(...args: Parameters<InterviewRoomModalComponent['openAddCustomModal']>) {
    return this.room.openAddCustomModal(...args);
  }
  submitCustomQuestion(...args: Parameters<InterviewRoomModalComponent['submitCustomQuestion']>) {
    return this.room.submitCustomQuestion(...args);
  }
  openGenerateAiModal(...args: Parameters<InterviewRoomModalComponent['openGenerateAiModal']>) {
    return this.room.openGenerateAiModal(...args);
  }
  submitGenerateAiQuestions(...args: Parameters<InterviewRoomModalComponent['submitGenerateAiQuestions']>) {
    return this.room.submitGenerateAiQuestions(...args);
  }
  removeQuestion(...args: Parameters<InterviewRoomModalComponent['removeQuestion']>) {
    return this.room.removeQuestion(...args);
  }
  updateApplicationStatus(...args: Parameters<InterviewRoomModalComponent['updateApplicationStatus']>) {
    return this.room.updateApplicationStatus(...args);
  }
  formatSeconds(...args: Parameters<InterviewRoomModalComponent['formatSeconds']>) {
    return this.room.formatSeconds(...args);
  }
  getScoreColor(...args: Parameters<InterviewRoomModalComponent['getScoreColor']>) {
    return this.room.getScoreColor(...args);
  }
  getCategoryColor(...args: Parameters<InterviewRoomModalComponent['getCategoryColor']>) {
    return this.room.getCategoryColor(...args);
  }
  getCategoryLabel(...args: Parameters<InterviewRoomModalComponent['getCategoryLabel']>) {
    return this.room.getCategoryLabel(...args);
  }
  getStatusColor(...args: Parameters<InterviewRoomModalComponent['getStatusColor']>) {
    return this.room.getStatusColor(...args);
  }
  getStatusLabel(...args: Parameters<InterviewRoomModalComponent['getStatusLabel']>) {
    return this.room.getStatusLabel(...args);
  }
  getRecColor(...args: Parameters<InterviewRoomModalComponent['getRecColor']>) {
    return this.room.getRecColor(...args);
  }
  getRecLabel(...args: Parameters<InterviewRoomModalComponent['getRecLabel']>) {
    return this.room.getRecLabel(...args);
  }
}
