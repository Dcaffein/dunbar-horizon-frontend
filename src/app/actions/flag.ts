"use server";

import { apiClient, isRedirectError } from "@/api/apiClient";
import type { FlagResult } from "@/api/model/flagResult";
import type { FlagDetailResult } from "@/api/model/flagDetailResult";
import type { FlagCreateRequest } from "@/api/model/flagCreateRequest";
import type { FlagDetailsUpdateRequest } from "@/api/model/flagDetailsUpdateRequest";
import type { FlagCapacityUpdateRequest } from "@/api/model/flagCapacityUpdateRequest";
import type { FlagScheduleUpdateRequest } from "@/api/model/flagScheduleUpdateRequest";

export async function getHostingFlagsAction() {
  try {
    const data = await apiClient.get<FlagResult[]>("/api/v1/flags/me/hosting");
    return { success: true as const, data };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { success: false as const, data: [] as FlagResult[] };
  }
}

export async function getParticipatingFlagsAction() {
  try {
    const data = await apiClient.get<FlagResult[]>("/api/v1/flags/me/participating");
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
