import './Card.css';

const Card = ({ children, className = '', ...props }) => (
  <div className={`common-card ${className}`} {...props}>
    {children}
  </div>
);

export default Card;
