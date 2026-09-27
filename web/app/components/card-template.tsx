import React from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card'
import OnlineStatus from './online-status'

type SensorCardProps = {
    children: React.ReactNode;
    description: string
    status: boolean,
    footerText?: string
}


const CardTemplate = ({children, description,status,footerText}: SensorCardProps) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"> 
                    <OnlineStatus status={status} />
                    Sensor Data
                </CardTitle>
                <CardDescription>
                    {description}
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
                {children}
            </CardContent>
            <CardFooter>
                {footerText}
            </CardFooter>
        </Card>
    )
}

export default CardTemplate