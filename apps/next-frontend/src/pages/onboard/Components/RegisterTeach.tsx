import OnboardForm from "./OnboardForm"

export const RegisterTeach = () => {
  return (
    <>
      <div>
        <h1>Charli</h1>
        <button type="button">Teach 🤑 </button>
      </div>

      <div>
        <OnboardForm onboardMode={"Teach"}/>
      </div>
    </>
  )
}



