"use server";

import { apiClient, isRedirectError, toFailure } from "@/api/apiClient";
import type { FlagResult } from "@/api/model/flagResult";
import type { SliceFlagResult } from "@/api/model/sliceFlagResult";
import type { FlagDetailResult } from "@/api/model/flagDetailResult";
import type { FlagCreateRequest } from "@/api/model/flagCreateRequest";
import type { FlagDetailsUpdateRequest } from "@/api/model/flagDetailsUpdateRequest";
import type { FlagCapacityUpdateRequest } from "@/api/model/flagCapacityUpdateRequest";
import type { FlagScheduleUpdateRequest } from "@/api/model/flagScheduleUpdateRequest";
import type { MemorialResult } from "@/api/model/memorialResult";
import type { CommentResult } from "@/api/model/commentResult";
import type { FlagInvitationResult } from "@/api/model/flagInvitationResult";
import { toFlagPage } from "@/components/Flag/flagPage";

export type FlagInvitationDirection = "RECEIVED" | "SENT";

const FLAG_PAGE_SIZE = 20;

export async function getHostingFlagsAction(page = 0, size = FLAG_PAGE_SIZE) {
  try {
    const data = await apiClient.get<SliceFlagResult>("/api/v1/flags", {
      params: { role: "HOST", page, size },
    });
    return { success: true as const, data: toFlagPage(data, page) };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { success: false as const, data: toFlagPage({}, page), failure: toFailure(error) };
  }
}

export async function getParticipatingFlagsAction(page = 0, size = FLAG_PAGE_SIZE) {
  try {
    const data = await apiClient.get<SliceFlagResult>("/api/v1/flags", {
      params: { role: "PARTICIPANT", page, size },
    });
    return { success: true as const, data: toFlagPage(data, page) };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { success: false as const, data: toFlagPage({}, page), failure: toFailure(error) };
  }
}

export async function getUserProfileFlagsAction(userId: number) {
  try {
    const data = await apiClient.get<FlagResult[]>("/api/v1/flags/profile", {
      params: { userId },
      silent: true,
    });
    return { success: true as const, data };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { success: false as const, data: [] as FlagResult[], failure: toFailure(error) };
  }
}

export async function getFeedFlagsAction(page = 0, size = FLAG_PAGE_SIZE) {
  try {
    const data = await apiClient.get<SliceFlagResult>("/api/v1/flags/feed", {
      params: { page, size },
    });
    return { success: true as const, data: toFlagPage(data, page) };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { success: false as const, data: toFlagPage({}, page), failure: toFailure(error) };
  }
}

export async function getFlagDetailAction(id: number) {
  try {
    const data = await apiClient.get<FlagDetailResult>(`/api/v1/flags/${id}`);
    return { success: true as const, data };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message = error instanceof Error ? error.message : "Flag를 불러오는 데 실패했습니다.";
    return { success: false as const, message };
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
    const message = error instanceof Error ? error.message : "Flag 삭제에 실패했습니다.";
    return { success: false as const, message };
  }
}

export async function closeRecruitmentAction(id: number) {
  try {
    await apiClient.patch(`/api/v1/flags/${id}/schedule/deadline`);
    return { success: true as const };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message = error instanceof Error ? error.message : "모집 마감에 실패했습니다.";
    return { success: false as const, message };
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
    await apiClient.delete(`/api/v1/flags/${id}/participants/me`);
    return { success: true as const };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message = error instanceof Error ? error.message : "참여 취소에 실패했습니다.";
    return { success: false as const, message };
  }
}

export async function inviteFriendAction(flagId: number, inviteeId: number) {
  try {
    await apiClient.post("/api/v1/flag-invitations", { flagId, inviteeId });
    return { success: true as const };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message = error instanceof Error ? error.message : "초대에 실패했습니다.";
    return { success: false as const, message };
  }
}

export async function acceptInvitationAction(invitationId: number) {
  try {
    await apiClient.patch(`/api/v1/flag-invitations/${invitationId}`, { status: "ACCEPTED" });
    return { success: true as const };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message = error instanceof Error ? error.message : "초대 수락에 실패했습니다.";
    return { success: false as const, message };
  }
}

export async function rejectInvitationAction(invitationId: number) {
  try {
    await apiClient.delete(`/api/v1/flag-invitations/${invitationId}`);
    return { success: true as const };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message = error instanceof Error ? error.message : "초대 거절에 실패했습니다.";
    return { success: false as const, message };
  }
}

export async function getFlagInvitationsAction(direction: FlagInvitationDirection) {
  try {
    const data = await apiClient.get<FlagInvitationResult[]>("/api/v1/flag-invitations", {
      params: { direction },
    });
    return { success: true as const, data };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { success: false as const, data: [] as FlagInvitationResult[], failure: toFailure(error) };
  }
}

export async function getReceivedInvitationsAction() {
  return getFlagInvitationsAction("RECEIVED");
}

export async function getSentInvitationsAction() {
  return getFlagInvitationsAction("SENT");
}

export async function cancelInvitationAction(invitationId: number) {
  try {
    await apiClient.delete(`/api/v1/flag-invitations/${invitationId}`);
    return { success: true as const };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message = error instanceof Error ? error.message : "초대 취소에 실패했습니다.";
    return { success: false as const, message };
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
    await apiClient.patch(`/api/v1/flags/${flagId}/participants/${participantId}`, { canInvite });
    return { success: true as const };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message = error instanceof Error ? error.message : "초대 권한 변경에 실패했습니다.";
    return { success: false as const, message };
  }
}

export async function getMemorialCountAction(flagId: number) {
  try {
    const count = await apiClient.get<number>(`/api/v1/flags/${flagId}/memorials/count`);
    return { success: true as const, count };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { success: false as const, count: 0, failure: toFailure(error) };
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
    return { success: false as const, data: [] as MemorialResult[], locked: true, failure: toFailure(error) };
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

export async function updateMemorialAction(flagId: number, id: number, content: string) {
  try {
    await apiClient.patch(`/api/v1/flags/${flagId}/memorials/${id}`, { content });
    return { success: true as const };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message = error instanceof Error ? error.message : "Memorial 수정에 실패했습니다.";
    return { success: false as const, message };
  }
}

export async function deleteMemorialAction(flagId: number, id: number) {
  try {
    await apiClient.delete(`/api/v1/flags/${flagId}/memorials/${id}`);
    return { success: true as const };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message = error instanceof Error ? error.message : "Memorial 삭제에 실패했습니다.";
    return { success: false as const, message };
  }
}

export async function getCommentsAction(flagId: number) {
  try {
    const data = await apiClient.get<CommentResult[]>(`/api/v1/flags/${flagId}/comments`);
    return { success: true as const, data };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { success: false as const, data: [] as CommentResult[], failure: toFailure(error) };
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

export async function createReplyAction(flagId: number, parentId: number, content: string, isPrivate?: boolean) {
  try {
    const data = await apiClient.post<number, { content: string; isPrivate?: boolean }>(
      `/api/v1/flags/${flagId}/comments/${parentId}/replies`,
      { content, ...(isPrivate ? { isPrivate } : {}) },
    );
    return { success: true as const, data };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message = error instanceof Error ? error.message : "대댓글 작성에 실패했습니다.";
    return { success: false as const, message };
  }
}

export async function updateCommentAction(flagId: number, commentId: number, content: string) {
  try {
    await apiClient.patch(`/api/v1/flags/${flagId}/comments/${commentId}`, { content });
    return { success: true as const };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message = error instanceof Error ? error.message : "댓글 수정에 실패했습니다.";
    return { success: false as const, message };
  }
}

export async function deleteCommentAction(flagId: number, commentId: number) {
  try {
    await apiClient.delete(`/api/v1/flags/${flagId}/comments/${commentId}`);
    return { success: true as const };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message = error instanceof Error ? error.message : "댓글 삭제에 실패했습니다.";
    return { success: false as const, message };
  }
}
