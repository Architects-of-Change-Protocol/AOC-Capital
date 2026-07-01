import { ButtonHTMLAttributes } from "react";

export function AuthButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`w-full rounded-xl border-2 border-black bg-pink-500 px-4 py-3 text-sm font-black text-white shadow-[4px_4px_0_#161616] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 ${props.className ?? ""}`}
    />
  );
}
