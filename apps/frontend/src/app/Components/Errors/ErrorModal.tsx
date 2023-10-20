interface ErrorModalPropTypes {
  errorText: string,
}

export const ErrorModal = ({errorText}: ErrorModalPropTypes) => {
  return <div class="ErrorModal"> {errorText} </div>
}
