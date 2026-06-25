import { Suspense } from "react"
import JoinForm from "./join-form"

export const metadata = {
  title: "Register — HARPAZO OWAS",
  description: "Connect with our team after giving your life to Christ",
}

export default function JoinPage() {
  return (
    <Suspense>
      <JoinForm />
    </Suspense>
  )
}
