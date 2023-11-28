import { Link } from 'react-router-dom';
import { ButtonLinkPropTypes } from '../../types/types'

const ButtonLink = ({ path, children, onButtonClick }: ButtonLinkPropTypes) => {
  const handleClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    // for internal button logic
    if (onButtonClick) {
      onButtonClick(e);
    }
  };

  return (
    <div className="w-44 p-3 rounded-lg bg-gray-300 text-center" onClick={handleClick}>
      <Link to={path}>
        <div className="text-2xl">
          {children}
        </div>
      </Link>
    </div>
  );
}

export default ButtonLink;
