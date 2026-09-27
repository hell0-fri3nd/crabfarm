import { cn } from "~/lib/utils"
// import { useEffect, useState } from 'react';
// import { Progress } from './ui/progress';
import AppLogoIcon from "./app-logo-icon"

const InfiniteProgressBar = ({ className, ...props }: React.ComponentProps<"svg">) => {
  
  // const [progress, setProgress] = useState(0);
  // const [direction, setDirection] = useState(1);

  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     setProgress((prev) => {
  //       let next = prev + direction * 3;
        
  //       if (next >= 100) {
  //         setDirection(-1);
  //         return 100;
  //       } else if (next <= 0) {
  //         setDirection(1);
  //         return 0;
  //       }
        
  //       return next;
  //     });
  //   }, 50);

  //   return () => clearInterval(interval);
  // }, [direction]);
  
  return (
    <div className="w-full space-y-4">
        <AppLogoIcon 
        role="status" 
        aria-label="Loading"
        className={cn("size-50", className)}
        {...props}>
        </AppLogoIcon>
        {/* <Progress value={progress} className="h-2" /> */}
    </div>
  );
}

export default InfiniteProgressBar;