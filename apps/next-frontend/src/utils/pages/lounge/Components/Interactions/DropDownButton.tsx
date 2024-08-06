import {  Dispatch } from 'react';
import { Listbox } from '@headlessui/react';
import {ChevronUpDownIcon} from '@heroicons/react/24/solid'
import { useNotificationContext } from '@/contexts/NotificationContext';
const userGroups: { name: "Learn" | "Teach" }[] = [
  { name: 'Learn' },
  { name: 'Teach' },
];
interface DropDownButtonProps {
  modeView: "Learn" | "Teach";
  setModeView: Dispatch<React.SetStateAction<"Learn" | "Teach">>
}

const DropDownButton = ({ modeView: modeView, setModeView: setModeView }: DropDownButtonProps) => {
  const {showIndicator} = useNotificationContext()
  const selectedUserGroup = userGroups.find(group => group.name === modeView);
  const groupEmojis = {
    Learn: '🎓',
    Teach: '🤑',
  };

  return (
    <div className="__dropdown-button-container__ flex justify-center m-10">
  <div className="__dropdown-button w-56 relative">
    {showIndicator && (
      <span className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4 sm:translate-x-1/2 sm:-translate-y-1/2 text-xs sm:text-sm z-10">
        🔴
      </span>
    )}
        <Listbox value={selectedUserGroup} onChange={(value) => setModeView(value.name)}>
          {() => (
            <>
              <div className="mt-1 relative">
                <Listbox.Button className="relative w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-center cursor-default focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                <span className="block truncate">{`${modeView} ${groupEmojis[modeView]}`}</span>
                  <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </span>
                </Listbox.Button>
                <Listbox.Options className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                  {userGroups.map((group, groupIdx) => (
                    <Listbox.Option
                      key={groupIdx}
                      className={({ active }) =>
                        `cursor-default select-none relative py-2 pl-10 pr-4 ${
active ? 'text-white bg-indigo-600' : 'text-gray-900'
}`
                      }
                      value={group}
                    >
                      {({ selected, active }) => (
                        <>
                          <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                            {`${group.name} ${groupEmojis[group.name]}`}
                          </span>
                          {selected ? (
                            <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
active ? 'text-white' : 'text-indigo-600'
}`}>
                            </span>
                          ) : null}
                        </>
                      )}
                    </Listbox.Option>
                  ))}
                </Listbox.Options>
              </div>
            </>
          )}
        </Listbox>
      </div>

    </div>
  );
};

export default DropDownButton;


