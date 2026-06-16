"use server";

import { apiClient, isRedirectError } from "@/api/apiClient";
import type { FlagResult } from "@/api/model/flagResult";
import type { FlagDetailResult } from "@/api/model/flagDetailResult";
import type { FlagCreateRequest } from "@/api/model/flagCreateRequest";
import type { FlagDetailsUpdateRequest } from "@/api/model/flagDetailsUpdateRequest";
import type { FlagCapacityUpdateRequest } from "@/api/model/flagCapacityUpdateRequest";
import type { FlagScheduleUpdateRequest } from "@/api/model/flagScheduleUpdateRequest";
import type { MemorialResult } from "@/api/model/memorialResult";
import type { CommentResult } from "@/api/model/commentResult";
import type { ReceivedFlagInvitationResult } from "@/api/model/receivedFlagInvitationResult";
import type { SentFlagInvitationResult } from "@/api/model/sentFlagInvitationResult";

export async function getHostingFlagsAction() {
  try {
    const data = await apiClient.get<FlagResult[]>("/api/v1/flags/me?role=HOST");
    return { success: true as const, data };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { success: false as const, data: [] as FlagResult[] };
  }
}

export async function getParticipatingFlagsAction() {
  try {
    const data = await apiClient.get<FlagResult[]>("/api/v1/flags/me?role=PARTICIPANT");
    return { success: true as const, data };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { success: false as const, data: [] as FlagResult[] };
  }
}

export async function getUserRecentFlagsAction(userId: number) {
  try {
    const data = await apiClient.get<FlagResult[]>(`/api/v1/flags/users/${userId}/recent`, { silent: true });
    return { success: true as const, data };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { success: false as const, data: [] as FlagResult[] };
  }
}

export async function getFriendFlagsAction() {
  try {
    const data = await apiClient.get<FlagResult[]>("/api/v1/flags/friends");
    return { success: true as const, data };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { success: false as const, data: [] as FlagResult[] };
  }
}

export async function getFlagDetailAction(id: number) {
  try {
    const data = await apiClient.get<FlagDetailResult>(`/api/v1/flags/${id}`);
    return { success: true as const, data };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { success: false as const, message: "Flag를 불러오는 데 실패했습니다." };
  }
}

export async function createFlagAction(body: FlagCreateRequest) {
  try {
    const data = await apiClient.post<number, FlagCreateRequest>("/api/v1/flags", body);
    return { success: true as const, data };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message = error instanceof Error ? error.message : "Flag 생성에 실패했습니다.";
    return { success: false as const, message };
  }
}

export async function deleteFlagAction(id: number) {
  try {
    await apiClient.delete(`/api/v1/flags/${id}`);
    return { success: true as const };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { success: false as const, message: "Flag 삭제에 실패했습니다." };
  }
}

export async function closeRecruitmentAction(id: number) {
  try {
    await apiClient.patch(`/api/v1/flags/${id}/schedule/deadline`);
    return { success: true as const };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { success: false as const, message: "모집 마감에 실패했습니다." };
  }
}

export async function participateAction(id: number) {
  try {
    await apiClient.post(`/api/v1/flags/${id}/participants`);
    return { success: true as const };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message = error instanceof Error ? error.message : "참여에 실패했습니다.";
    return { success: false as const, message };
  }
}

export async function leaveAction(id: number) {
  try {
    await apiClient.delete(`/api/v1/flags/${id}/participants`);
    return { success: true as const };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { success: false as const, message: "참여 취소에 실패했습니다." };
  }
}

export async function inviteFriendAction(flagId: number, inviteeId: number) {
  try {
    await apiClient.post(`/api/v1/flags/${flagId}/invitations`, { inviteeId });
    return { success: true as const };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message = error instanceof Error ? error.message : "초대에 실패했습니다.";
    return { success: false as const, message };
  }
}

export async function acceptInvitationAction(invitationId: number) {
  try {
    await apiClient.post(`/api/v1/flag-invitations/${invitationId}/accept`);
    return { success: true as const };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { success: false as const, message: "초대 수락에 실패했습니다." };
  }
}

export async function rejectInvitationAction(invitationId: number) {
  try {
    await apiClient.post(`/api/v1/flag-invitations/${invitationId}/reject`);
    return { success: true as const };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { success: false as const, message: "초대 거절에 실패했습니다." };
  }
}

export async function getReceivedInvitationsAction() {
  try {
    const data = await apiClient.get<ReceivedFlagInvitationResult[]>("/api/v1/flag-invitations/received");
    return { success: true as const, data };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { success: false as const, data: [] as ReceivedFlagInvitationResult[] };
  }
}

export async function getSentInvitationsAction() {
  try {
    const data = await apiClient.get<SentFlagInvitationResult[]>("/api/v1/flag-invitations/sent");
    return { success: true as const, data };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { success: false as const, data: [] as SentFlagInvitationResult[] };
  }
}

export async function cancelInvitationAction(invitationId: number) {
  try {
    await apiClient.delete(`/api/v1/flag-invitations/${invitationId}`);
    return { success: true as const };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { success: false as const, message: "초대 취소에 실패했습니다." };
  }
}

export async function updateFlagDetailsAction(id: number, body: FlagDetailsUpdateRequest) {
  try {
    await apiClient.patch(`/api/v1/flags/${id}/details`, body);
    return { success: true as const };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message = error instanceof Error ? error.message : "제목·설명 수정에 실패했습니다.";
    return { success: false as const, message };
  }
}

export async function updateFlagCapacityAction(id: number, body: FlagCapacityUpdateRequest) {
  try {
    await apiClient.patch(`/api/v1/flags/${id}/capacity`, body);
    return { success: true as const };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message = error instanceof Error ? error.message : "인원 수정에 실패했습니다.";
    return { success: false as const, message };
  }
}

export async function updateFlagScheduleAction(id: number, body: FlagScheduleUpdateRequest) {
  try {
    await apiClient.put(`/api/v1/flags/${id}/schedule`, body);
    return { success: true as const };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message = error instanceof Error ? error.message : "일정 수정에 실패했습니다.";
    return { success: false as const, message };
  }
}

export async function updateInvitePermissionAction(
  flagId: number,
  participantId: number,
  canInvite: boolean,
) {
  try {
    await apiClient.patch(`/api/v1/flags/${flagId}/participants/${participantId}/invite-permission`, { canInvite });
    return { success: true as const };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { success: false as const, message: "초대 권한 변경에 실패했습니다." };
  }
}

export async function getMemorialCountAction(flagId: number) {
  try {
    const count = await apiClient.get<number>(`/api/v1/flags/${flagId}/memorials/count`);
    return { success: true as const, count };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { success: false as const, count: 0 };
  }
}

export async function getMemorialsAction(flagId: number) {
  try {
    const res = await apiClient.get<{ memorials?: MemorialResult[]; locked?: boolean }>(
      `/api/v1/flags/${flagId}/memorials`
    );
    return { success: true as const, data: res.memorials ?? [], locked: res.locked ?? false };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { success: false as const, data: [] as MemorialResult[], locked: true };
  }
}

export async function createMemorialAction(flagId: number, content: string) {
  try {
    const data = await apiClient.post<number, { content: string }>(`/api/v1/flags/${flagId}/memorials`, { content });
    return { success: true as const, data };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message = error instanceof Error ? error.message : "Memorial 작성에 실패했습니다.";
    return { success: false as const, message };
  }
}

export async function updateMemorialAction(id: number, content: string) {
  try {
    await apiClient.patch(`/api/v1/flags/memorials/${id}`, { content });
    return { success: true as const };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message = error instanceof Error ? error.message : "Memorial 수정에 실패했습니다.";
    return { success: false as const, message };
  }
}

export async function deleteMemorialAction(id: number) {
  try {
    await apiClient.delete(`/api/v1/flags/memorials/${id}`);
    return { success: true as const };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { success: false as const, message: "Memorial 삭제에 실패했습니다." };
  }
}

export async function getCommentsAction(flagId: number) {
  try {
    const data = await apiClient.get<CommentResult[]>(`/api/v1/flags/${flagId}/comments`);
    return { success: true as const, data };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { success: false as const, data: [] as CommentResult[] };
  }
}

export async function createCommentAction(flagId: number, content: string, isPrivate?: boolean) {
  try {
    const data = await apiClient.post<number, { content: string; isPrivate?: boolean }>(
      `/api/v1/flags/${flagId}/comments`,
      { content, ...(isPrivate ? { isPrivate } : {}) },
    );
    return { success: true as const, data };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message = error instanceof Error ? error.message : "댓글 작성에 실패했습니다.";
    return { success: false as const, message };
  }
}

export async function createReplyAction(parentId: number, content: string, isPrivate?: boolean) {
  try {
    const data = await apiClient.post<number, { content: string; isPrivate?: boolean }>(
      `/api/v1/comments/${parentId}/replies`,
      { content, ...(isPrivate ? { isPrivate } : {}) },
    );
    return { success: true as const, data };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message = error instanceof Error ? error.message : "대댓글 작성에 실패했습니다.";
    return { success: false as const, message };
  }
}

export async function updateCommentAction(commentId: number, content: string) {
  try {
    await apiClient.patch(`/api/v1/comments/${commentId}`, { content });
    return { success: true as const };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message = error instanceof Error ? error.message : "댓글 수정에 실패했습니다.";
    return { success: false as const, message };
  }
}

export async function deleteCommentAction(commentId: number) {
  try {
    await apiClient.delete(`/api/v1/comments/${commentId}`);
    return { success: true as const };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { success: false as const, message: "댓글 삭제에 실패했습니다." };
  }
}
