import { Circle } from 'lucide-react'
import React from 'react'

const OnlineStatus = ({ status = false }: { status?: boolean }) => {
  return (
    status ? 
        <Circle className="h-3 w-3 bg-green-500 text-green-500 rounded-full p-1" /> :    
        <Circle className="h-3 w-3 bg-gray-400 text-gray-400 rounded-full p-1" /> 

  )
}

export default OnlineStatus