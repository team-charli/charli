import { useFormikContext, Formik } from 'formik';
import UserListLearnTeachAll from "./UserListLearnTeachAll";

export type SelectionType = "Learn" | "Teach" | "All" | "";

interface ToggleButtonProps {
  label: SelectionType;
  name: string;
}

type FormValues = {
  option: SelectionType;
};

const ButtonLearnTeachAll = ({ label, name }: ToggleButtonProps) => {
  const { setFieldValue } = useFormikContext<FormValues>();
  return (
    <div>
      <button
        type="button"
        onClick={() => setFieldValue(name, label)} // label is already of type SelectionType
      >
        {label}
      </button>
    </div>
  );
};

const FormLearnTeachAll = () => (
<Formik
  initialValues={{ option: '' as SelectionType }} // Cast the initial value to SelectionType
  onSubmit={() => {}}
>
    {({ values }) => (  // Access Formik state via render props
      <>
        <form>
          <ButtonLearnTeachAll name="option" label="Learn" />
          <ButtonLearnTeachAll name="option" label="Teach" />
          <ButtonLearnTeachAll name="option" label="All" />
        </form>
        {/* Pass current selection as prop */}
        <UserListLearnTeachAll selection={values.option} />
      </>
    )}
  </Formik>
);

export default FormLearnTeachAll;
