"use server";

import { apiClient, isRedirectError } from "@/api/apiClient";
import type { NotificationResponse } from "@/api/model/notificationResponse";
import type { SliceNotificationResponse } from "@/api/model/sliceNotificationResponse";
import type { DeviceTokenStatusResponse } from "@/api/model/deviceTokenStatusResponse";

export async function getUnreadCountAction() {
  try {
    const data = await apiClient.get<number>("/api/v1/notifications/unread-count");
    return { success: true as const, data };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("getUnreadCountAction error:", error);
    return { success: false as const, data: 0 };
  }
}

export async function getNotificationsAction(page = 0, size = 20) {
  try {
    const data = await apiClient.get<SliceNotificationResponse>(
      `/api/v1/notifications?page=${page}&size=${size}`,
    );
    return { success: true as const, data };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("getNotificationsAction error:", error);
    return { success: false as const, message: "알림을 불러오는 데 실패했습니다." };
  }
}

export async function readNotificationAction(notificationId: string) {
  try {
    const data = await apiClient.patch<NotificationResponse>(
      `/api/v1/notifications/${notificationId}/read`,
    );
    return { success: true as const, data };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("readNotificationAction error:", error);
    return { success: false as const, message: "읽음 처리에 실패했습니다." };
  }
}

export async function registerDeviceTokenAction(token: string) {
  try {
    await apiClient.post("/api/v1/notifications/device-token", { token });
    return { success: true as const };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("registerDeviceTokenAction error:", error);
    return { success: false as const };
  }
}

export async function removeDeviceTokenAction() {
  try {
    await apiClient.delete("/api/v1/notifications/device-token");
    return { success: true as const };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("removeDeviceTokenAction error:", error);
    return { success: false as const };
  }
}

export async function deleteNotificationAction(notificationId: string) {
  try {
    await apiClient.delete(`/api/v1/notifications/${notificationId}`);
    return { success: true as const };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("deleteNotificationAction error:", error);
    return { success: false as const };
  }
}

export async function checkDeviceTokenStatusAction(token: string) {
  try {
    const data = await apiClient.get<DeviceTokenStatusResponse>(
      `/api/v1/notifications/device-token/status?token=${encodeURIComponent(token)}`,
    );
    return { success: true as const, data };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("checkDeviceTokenStatusAction error:", error);
    return { success: false as const };
  }
}
