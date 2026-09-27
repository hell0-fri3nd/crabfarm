import React from 'react'

import { CalendarClock } from 'lucide-react';
import { Button, Label } from '~/components/ui';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '~/components/ui/card';
import { Switch } from '~/components/ui/switch';

type FeederCardProps = {
    children: React.ReactNode;
    title: string
    description: string
}
const CardFeeder = ({children, title, description} : FeederCardProps) => {
    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>  
                {/* <CardAction>
                    <Button ><CalendarClock/></Button>
                </CardAction> */}
            </CardHeader>
            <CardContent>
                {children}
            </CardContent>
        </Card>
    )
}

export default CardFeeder