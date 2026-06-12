"use server";

import { apiClient, isRedirectError } from "@/api/apiClient";
import type { BuzzSummaryResult } from "@/api/model/buzzSummaryResult";
import type { BuzzDetailResult } from "@/api/model/buzzDetailResult";
import type { BuzzCreateRequest } from "@/api/model/buzzCreateRequest";
import type { BuzzCommentResult } from "@/api/model/buzzCommentResult";
import type { BuzzCommentRequest } from "@/api/model/buzzCommentRequest";
import type { SliceBuzzSummaryResult } from "@/api/model/sliceBuzzSummaryResult";
import type { PresignedUploadResult } from "@/api/model/presignedUploadResult";
import type { PresignRequest } from "@/api/model/presignRequest";
import type { LabelResult } from "@/api/model/labelResult";

export async function getUnreadSendersAction() {
  try {
    const data = await apiClient.get<number[]>("/api/v1/buzzes/senders/unread");
    return { success: true as const, data };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("getUnreadSendersAction error:", error);
    return { success: false as const, data: [] as number[] };
  }
}

export async function getReceivedBuzzesAction(page = 0, size = 20) {
  try {
    const data = await apiClient.get<SliceBuzzSummaryResult>(
      `/api/v1/buzzes/?page=${page}&size=${size}`,
    );
    return { success: true as const, data };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("getReceivedBuzzesAction error:", error);
    return { success: false as const, message: "Buzz 목록을 불러오는 데 실패했습니다." };
  }
}

export async function getBuzzDetailAction(buzzId: string) {
  try {
    const data = await apiClient.get<BuzzDetailResult>(`/api/v1/buzzes/${buzzId}`);
    return { success: true as const, data };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("getBuzzDetailAction error:", error);
    return { success: false as const, message: "Buzz를 불러오는 데 실패했습니다." };
  }
}

export async function createBuzzAction(body: BuzzCreateRequest) {
  try {
    const data = await apiClient.post<BuzzDetailResult, BuzzCreateRequest>(
      "/api/v1/buzzes",
      body,
    );
    return { success: true as const, data };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message = error instanceof Error ? error.message : "Buzz 작성에 실패했습니다.";
    return { success: false as const, message };
  }
}

export async function deleteBuzzAction(buzzId: string) {
  try {
    await apiClient.delete(`/api/v1/buzzes/${buzzId}`);
    return { success: true as const };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { success: false as const, message: "Buzz 삭제에 실패했습니다." };
  }
}

export async function addCommentAction(buzzId: string, body: BuzzCommentRequest) {
  try {
    const data = await apiClient.post<BuzzCommentResult, BuzzCommentRequest>(
      `/api/v1/buzzes/${buzzId}/comments`,
      body,
    );
    return { success: true as const, data };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message = error instanceof Error ? error.message : "댓글 작성에 실패했습니다.";
    return { success: false as const, message };
  }
}

export async function updateCommentAction(
  buzzId: string,
  commentId: string,
  body: BuzzCommentRequest,
) {
  try {
    const data = await apiClient.patch<BuzzCommentResult, BuzzCommentRequest>(
      `/api/v1/buzzes/${buzzId}/comments/${commentId}`,
      body,
    );
    return { success: true as const, data };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { success: false as const, message: "댓글 수정에 실패했습니다." };
  }
}

export async function deleteCommentAction(buzzId: string, commentId: string) {
  try {
    await apiClient.delete(`/api/v1/buzzes/${buzzId}/comments/${commentId}`);
    return { success: true as const };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { success: false as const, message: "댓글 삭제에 실패했습니다." };
  }
}

export async function presignImagesAction(reqs: PresignRequest[]) {
  try {
    const data = await apiClient.post<PresignedUploadResult[], PresignRequest[]>(
      "/api/v1/buzzes/images/presign",
      reqs,
    );
    return { success: true as const, data };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { success: false as const, message: "이미지 업로드 준비에 실패했습니다." };
  }
}

export async function getLabelsAction() {
  try {
    const data = await apiClient.get<LabelResult[]>("/api/v1/labels");
    return { success: true as const, data };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("getLabelsAction error:", error);
    return { success: false as const, data: [] as LabelResult[] };
  }
}

export async function getMyBuzzSummariesAction(): Promise<BuzzSummaryResult[]> {
  // 발신 목록 API 없음 — 빈 배열 반환
  return [];
}
