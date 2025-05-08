//DropDownButton.tsx
import { Dispatch } from 'react';
import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/react';
import { ChevronUpDownIcon } from '@heroicons/react/24/solid'
import { useSessionsContext } from '@/contexts/SessionsContext';

const userGroups: { name: "Learn" | "Teach" }[] = [
  { name: 'Learn' },
  { name: 'Teach' },
];

interface DropDownButtonProps {
  modeView: "Learn" | "Teach";
  setModeView: Dispatch<React.SetStateAction<"Learn" | "Teach">>
}

const DropDownButton = ({ modeView, setModeView }: DropDownButtonProps) => {
  const { showIndicator } = useSessionsContext()
  const selectedUserGroup = userGroups.find(group => group.name === modeView);
  const groupEmojis = {
    Learn: '🎓',
    Teach: '🤑',
  };

  return (
    <div className="flex justify-center my-4 sm:my-6 md:my-8 lg:my-10 px-4 sm:px-0">
      <div className="w-full max-w-[180px] sm:max-w-[220px] md:max-w-[250px] relative">
        {showIndicator && (
          <span className="absolute -top-1 -right-1 transform sm:-top-2 sm:-right-2 w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center bg-red-500 text-white rounded-full text-xs animate-pulse z-10">
            <span className="sr-only">New notification</span>
          </span>
        )}
        <Listbox value={selectedUserGroup} onChange={(value) => setModeView(value.name)}>
          <div className="relative">
            <ListboxButton className="relative w-full bg-white border border-gray-300 rounded-lg shadow-sm 
              pl-3 sm:pl-4 pr-8 sm:pr-10 py-2 sm:py-2.5 md:py-3
              text-center cursor-pointer 
              hover:bg-gray-50 hover:border-gray-400
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
              text-sm sm:text-base md:text-lg
              transition-colors">
              <span className="flex items-center justify-center space-x-2">
                <span className="text-gray-800 font-medium">{modeView}</span>
                <span className="text-lg sm:text-xl md:text-2xl">{groupEmojis[modeView]}</span>
              </span>
              <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <ChevronUpDownIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" aria-hidden="true" />
              </span>
            </ListboxButton>
            
            <ListboxOptions className="absolute z-20 mt-1 w-full bg-white shadow-lg max-h-60 
              rounded-md 
              py-1 sm:py-1.5 
              text-sm sm:text-base
              ring-1 ring-black ring-opacity-5 
              border border-gray-200
              overflow-auto focus:outline-none">
              {userGroups.map((group, groupIdx) => (
                <ListboxOption
                  key={groupIdx}
                  value={group}
                  className={({ active, selected }) =>
                    `cursor-pointer select-none relative 
                    py-2 sm:py-2.5 
                    pl-10 pr-4 
                    ${active ? 'text-white bg-blue-600' : 'text-gray-900'}
                    ${selected ? 'bg-blue-50 text-blue-900' : ''}
                    hover:bg-blue-600 hover:text-white
                    transition-colors duration-150`
                  }
                >
                  {({ selected }) => (
                    <>
                      <span className={`flex items-center space-x-2 ${selected ? 'font-medium' : 'font-normal'}`}>
                        <span>{group.name}</span>
                        <span className="text-lg sm:text-xl">{groupEmojis[group.name]}</span>
                      </span>
                      {selected && (
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </span>
                      )}
                    </>
                  )}
                </ListboxOption>
              ))}
            </ListboxOptions>
          </div>
        </Listbox>
      </div>
    </div>
  );
};

export default DropDownButton;

