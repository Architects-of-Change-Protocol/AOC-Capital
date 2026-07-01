import { InputHTMLAttributes, SelectHTMLAttributes } from "react";

export function AuthInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border-2 border-black px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-pink-300 ${props.className ?? ""}`}
    />
  );
}

export function AuthSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-xl border-2 border-black px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-pink-300 ${props.className ?? ""}`}
    />
  );
}
