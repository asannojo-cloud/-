import { useEffect, useRef } from "react";

/**
 * 클립보드에 복사된 이미지를 Ctrl+V(붙여넣기)로 바로 받을 수 있게 해준다.
 * (캡처 프로그램이나 다른 곳에서 이미지를 복사해온 경우, 파일로 저장하지 않고도
 * 바로 붙여넣기만으로 사진을 등록할 수 있도록 하기 위함.)
 * enabled가 false면 리스너를 등록하지 않는다(다른 화면/입력에 영향 주지 않기 위함).
 */
export function usePasteImage(onImage: (file: File) => void, enabled: boolean = true) {
  // 리스너는 한 번만 등록하고, 항상 최신 콜백을 참조하도록 ref로 우회한다
  // (그렇지 않으면 콜백이 감싸고 있는 state가 등록 시점에 고정되어버린다).
  const onImageRef = useRef(onImage);
  onImageRef.current = onImage;

  useEffect(() => {
    if (!enabled) return;

    function handlePaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            onImageRef.current(file);
          }
          return;
        }
      }
    }

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [enabled]);
}
