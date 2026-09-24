import { Suspense } from "react"
import SetupAccountForm from "./setup-account-form"

export default function SetupAccountPage() {
  return (
    <Suspense>
      <SetupAccountForm />
    </Suspense>
  )
}
