"use client";

import { useState, useEffect, useCallback } from "react";
import { getCurrentToken, requestNotificationPermission } from "@/lib/firebase";
import {
  registerDeviceTokenAction,
  removeDeviceTokenAction,
  checkDeviceTokenStatusAction,
} from "@/app/actions/notification";

interface UseFcmTokenResult {
  alarmOn: boolean;
  loading: boolean;
  deniedModal: boolean;
  toggleOn: () => Promise<void>;
  toggleOff: () => Promise<void>;
  dismissDeniedModal: () => void;
}

export function useFcmToken(): UseFcmTokenResult {
  const [alarmOn, setAlarmOn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deniedModal, setDeniedModal] = useState(false);

  useEffect(() => {
    async function init() {
      if (Notification.permission !== "granted") {
        setLoading(false);
        return;
      }

      // localStorage를 1차 소스로 사용 (toggleOn/Off 성공 시 동기화됨)
      const storedToken = localStorage.getItem("fcmToken");
      if (!storedToken) {
        setAlarmOn(false);
        setLoading(false);
        return;
      }

      // 백엔드와 동기화 확인
      const result = await checkDeviceTokenStatusAction(storedToken);
      if (result.success) {
        const registered = result.data?.registered ?? false;
        setAlarmOn(registered);
        if (!registered) localStorage.removeItem("fcmToken");
      } else {
        // 백엔드 확인 실패 시 localStorage 상태 유지
        setAlarmOn(true);
      }
      setLoading(false);
    }

    init();
  }, []);

  const toggleOn = useCallback(async () => {
    const permission = Notification.permission;

    if (permission === "denied") {
      setDeniedModal(true);
      return;
    }

    setLoading(true);
    try {
      let token: string | null = null;

      if (permission === "granted") {
        token = await getCurrentToken();
      } else {
        // 'default' — 최초 권한 요청 (사용자 제스처에 묶임)
        token = await requestNotificationPermission();
      }

      if (!token) return;

      const result = await registerDeviceTokenAction(token);
      if (result.success) {
        localStorage.setItem("fcmToken", token);
        setAlarmOn(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleOff = useCallback(async () => {
    setLoading(true);
    try {
      const result = await removeDeviceTokenAction();
      if (result.success) {
        localStorage.removeItem("fcmToken");
        setAlarmOn(false);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const dismissDeniedModal = useCallback(() => setDeniedModal(false), []);

  return { alarmOn, loading, deniedModal, toggleOn, toggleOff, dismissDeniedModal };
}
