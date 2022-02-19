import { useRef } from "react";

export const useLastData = <S>(data: S) => {
  const ref = useRef(data);

  if (data !== null && data !== undefined) {
    ref.current = data;
  }

  return ref.current;
};
