export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1B4F72] to-[#154360] flex items-center justify-center p-4">
      {children}
    </div>
  )
}
