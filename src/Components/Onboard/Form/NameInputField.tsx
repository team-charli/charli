
const NameInputField = ({ register, errors }) => {
  return (
    <div className="__name-input-container__ flex justify-center mt-10 mr-10">
      <label htmlFor="name" className="mr-2">Name:</label>
      <input className="border-2 border-black" {...register("name")} type="text" />
      {errors.name && <p>{errors.name.message}</p>}
    </div>
  );
};

export default NameInputField;

