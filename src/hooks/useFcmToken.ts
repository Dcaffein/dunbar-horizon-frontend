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

      const token = await getCurrentToken();
      if (!token) {
        setLoading(false);
        return;
      }

      const result = await checkDeviceTokenStatusAction(token);
      if (result.success) {
        setAlarmOn(result.data?.registered ?? false);
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
      const token = await getCurrentToken();
      if (!token) return;

      const result = await removeDeviceTokenAction(token);
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
