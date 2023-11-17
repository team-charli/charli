interface CreateAccountProp {
  signUp: any;
  error?: Error;
}

export default function CreateAccount({ signUp, error }: CreateAccountProp) {
  return (
    <>
      {error && (
        <p>{error.message}</p>
      )}
      <h1>Need a PKP?</h1>
      <p>
        There doesn&apos;t seem to be a Lit wallet associated with your
        credentials. Create one today.
      </p>
      <button onClick={signUp} className="btn btn--primary">
        Sign up
      </button>
    </>
  );
}

