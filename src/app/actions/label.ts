"use server";

import { apiClient, isRedirectError } from "@/api/apiClient";
import type { LabelResult } from "@/api/model/labelResult";
import type { LabelCreateRequest } from "@/api/model/labelCreateRequest";
import type { LabelMemberAddRequest } from "@/api/model/labelMemberAddRequest";

export async function getLabelsAction() {
  try {
    const data = await apiClient.get<LabelResult[]>("/api/v1/labels");
    return { success: true as const, data };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("getLabelsAction error:", error);
    return { success: false as const, data: [] as LabelResult[], message: "라벨 목록을 불러오는 데 실패했습니다." };
  }
}

export async function createLabelAction(labelName: string) {
  try {
    const body: LabelCreateRequest = { labelName };
    const data = await apiClient.post<LabelResult, LabelCreateRequest>("/api/v1/labels", body);
    return { success: true as const, data };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("createLabelAction error:", error);
    return { success: false as const, data: null, message: "라벨 생성에 실패했습니다." };
  }
}

export async function deleteLabelAction(labelId: string) {
  try {
    await apiClient.delete(`/api/v1/labels/${labelId}`);
    return { success: true as const };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("deleteLabelAction error:", error);
    return { success: false as const, message: "라벨 삭제에 실패했습니다." };
  }
}

export async function addLabelMemberAction(labelId: string, memberId: number) {
  try {
    const body: LabelMemberAddRequest = { memberId };
    await apiClient.post(`/api/v1/labels/${labelId}/members`, body);
    return { success: true as const };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("addLabelMemberAction error:", error);
    return { success: false as const, message: "멤버 추가에 실패했습니다." };
  }
}

export async function removeLabelMemberAction(labelId: string, memberId: number) {
  try {
    await apiClient.delete(`/api/v1/labels/${labelId}/members/${memberId}`);
    return { success: true as const };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("removeLabelMemberAction error:", error);
    return { success: false as const, message: "멤버 삭제에 실패했습니다." };
  }
}
