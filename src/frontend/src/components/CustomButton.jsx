export default function CustomButton({ children, className = '', ...props }) {
  return <button type="button" className={`w-full rounded-lg px-4 py-3 font-semibold text-white shadow-md cursor-pointer disabled:opacity-70 disabled:cursor-wait bg-[#1269ad] ${className}`.trim()} {...props}>{children}</button>
}
