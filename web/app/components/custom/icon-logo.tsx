
import type { ImgHTMLAttributes } from "react";
import App_Logo from "../../assets/images/crabfarm_icon.png";

interface IconLogoProps extends ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
}

const IconLogo = ({src, ...props} : IconLogoProps) => {

  return (
    <img src={src ?? App_Logo}alt="App Logo" className="h-full w-full" {...props}/>
  )
}

export default IconLogo