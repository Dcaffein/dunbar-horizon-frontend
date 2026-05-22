import { useState } from "react";
import { updateFriendAction, deleteFriendAction } from "@/app/actions/friendship";
import type { FriendshipDetail } from "@/components/socialGraph/types";

interface UseFriendActionPanelProps {
  friend: FriendshipDetail;
  onAliasUpdate: (friendId: number, newAlias: string) => void;
  onMuteToggle: (friendId: number, newValue: boolean) => void;
  onRoutableToggle: (friendId: number, newValue: boolean) => void;
  onDelete: (friendId: number) => void;
}

export function useFriendActionPanel({
  friend,
  onAliasUpdate,
  onMuteToggle,
  onRoutableToggle,
  onDelete,
}: UseFriendActionPanelProps) {
  const [aliasInput, setAliasInput] = useState(friend.friendAlias ?? "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSaveAlias() {
    setIsLoading(true);
    setError(null);
    const result = await updateFriendAction(friend.friendId, {
      friendAlias: aliasInput,
    });
    setIsLoading(false);
    if (result.success) {
      onAliasUpdate(friend.friendId, aliasInput);
    } else {
      setError(result.message ?? null);
    }
  }

  async function handleMuteToggle() {
    setIsLoading(true);
    setError(null);
    const newValue = !friend.isMuted;
    const result = await updateFriendAction(friend.friendId, {
      isMuted: newValue,
    });
    setIsLoading(false);
    if (result.success) {
      onMuteToggle(friend.friendId, newValue);
    } else {
      setError(result.message ?? null);
    }
  }

  async function handleRoutableToggle() {
    setIsLoading(true);
    setError(null);
    const newValue = !(friend.isRoutable ?? true);
    const result = await updateFriendAction(friend.friendId, {
      isRoutable: newValue,
    });
    setIsLoading(false);
    if (result.success) {
      onRoutableToggle(friend.friendId, newValue);
    } else {
      setError(result.message ?? null);
    }
  }

  async function handleDelete() {
    setIsLoading(true);
    setError(null);
    const result = await deleteFriendAction(friend.friendId);
    setIsLoading(false);
    if (result.success) {
      onDelete(friend.friendId);
    } else {
      setError(result.message ?? null);
    }
  }

  return {
    aliasInput,
    setAliasInput,
    isLoading,
    error,
    handleSaveAlias,
    handleMuteToggle,
    handleRoutableToggle,
    handleDelete,
  };
}
