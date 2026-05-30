"use server";

import { apiClient, isRedirectError } from "@/api/apiClient";
import type { FlagResult } from "@/api/model/flagResult";
import type { FlagDetailResult } from "@/api/model/flagDetailResult";
import type { FlagCreateRequest } from "@/api/model/flagCreateRequest";

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
