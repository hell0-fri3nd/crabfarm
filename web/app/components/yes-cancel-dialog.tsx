import React from 'react'
import { 
    AlertDialog, 
    AlertDialogAction, 
    AlertDialogCancel, 
    AlertDialogContent, 
    AlertDialogDescription, 
    AlertDialogFooter, 
    AlertDialogHeader, 
    AlertDialogTitle, 
    AlertDialogTrigger 
} from './ui/alert-dialog'

type YesCancelDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    onConfirm?: () => void
    title: string
    description: string
}

const YesCancelDialog = ({
    open,
    onOpenChange,
    onConfirm,
    title,
    description
}: YesCancelDialogProps) => {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {description}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction             
                    onClick={() => {
                        onConfirm?.()
                        onOpenChange(false)
                    }}
                    >Yes</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}               

export default YesCancelDialog