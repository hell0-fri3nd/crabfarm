import React from 'react'
import IconLogo from '../../custom/icon-logo';


interface AuthLayoutProps {
    children: React.ReactNode;
}
const AuthSplitLayout = ({ children }: AuthLayoutProps) => {
  return (
    
     <div className="
        relative 
        grid h-dvh flex-col 
        bg-muted-foreground 
        items-center justify-center 
        sm:px-0 
        md:grid-cols-[55%_45%] md:p-0
        lg:grid-cols-[60%_40%] lg:px-[5%] lg:py-[2.5%]">
        
        <div className="
          relative 
          hidden md:flex 
          h-full flex-col 
          rounded-none
          p-8
          lg:p-8 lg:rounded-l-[3rem]
          bg-primary
          item-start">
            
            <div className="flex flex-col items-start gap-2">
              <IconLogo className='h-10 fill-current'/>
              <div className="text-4xl font-large text-muted font-bold">Crabfarm</div>
            </div>
          
            <div className="text-muted text-sm text-balance">IoT and Machine learning based aquaculture</div>

        </div>

        <div className="
          flex 
          w-full 
          flex-col 
          p-8 
          lg:p-8 lg:rounded-r-[3rem] 
          md:h-full md:items-center md:justify-center md:p-10 
          sm: h-full
          bg-secondary">

          <div className="   
            mx-auto 
            w-full 
            max-w-sm 
            flex 
            flex-col 
            item-center 
            justify-center 
            space-y-6
            ">
      
            <div className="
              flex flex-col 
              justify-start gap-2 
              text-center w-full">

              <IconLogo className='h-20 w-auto object-contain' src='../../assets/logos/SM_Logo.png'/>
              <h1 className="text-2xl font-large text-primary">Back Office Citizen Information Management Systems</h1>
              <p className="text-sm text-balance text-secondary-foreground">For LGU and Government Agencies</p>

            </div>

            {children}
            
          </div>

        </div>

  
    </div>
  )
}

export default AuthSplitLayout