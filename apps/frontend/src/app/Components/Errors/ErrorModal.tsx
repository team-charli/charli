interface ErrorModalPropTypes {
  errorText: string,
}

export const ErrorModal = ({errorText}: ErrorModalPropTypes) => {
  return <div className="ErrorModal"> {errorText} </div>
}
