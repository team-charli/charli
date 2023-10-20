import { useFormikContext, Formik } from 'formik';
import UserListLearnTeachAll from "./UserListLearnTeachAll";

export type SelectionType = "Learn" | "Teach" | "All" | "";

interface ToggleButtonProps {
  label: string;
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
        onClick={() => setFieldValue(name, label)}  // Always set the value to label
      >
        {label}
      </button>
    </div>
  );
};

const FormLearnTeachAll = () => (
  <Formik
    initialValues={{ option: '' }}
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
