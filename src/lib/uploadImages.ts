import { presignImagesAction } from "@/app/actions/buzz";

export async function uploadImages(files: File[]): Promise<string[]> {
  if (files.length === 0) return [];

  const result = await presignImagesAction(
    files.map((f) => ({ contentType: f.type, size: f.size })),
  );
  if (!result.success || !result.data) throw new Error("이미지 업로드 준비 실패");

  await Promise.all(
    result.data.map((presigned, i) =>
      fetch(presigned.uploadUrl!, {
        method: "PUT",
        body: files[i],
        headers: { "Content-Type": files[i].type },
      }),
    ),
  );

  return result.data.map((p) => p.objectKey!);
}
