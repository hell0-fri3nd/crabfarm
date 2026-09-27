import React from 'react'
import { InputOTP, InputOTPGroup, InputOTPSlot,  } from '~/components/ui/input-otp'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import {   
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormMessage
} from '~/components/ui/form'
import InputError from '~/components/input-error'
import { REGEXP_ONLY_DIGITS } from 'input-otp'
import { Spinner } from '~/components/ui/spinner'
import { pin } from '~/store/auth/auth-slice';
import type { AppDispatch, RootState } from '~/store/store'
import { useDispatch, useSelector } from 'react-redux'
// import type { RootState } from '@reduxjs/toolkit/query'

const FormSchema = z.object({
  pin: z.string().min(4, {
    message: "Your one-time password must be 4 characters.",
  }),
})
 
const Pin =  () => {

    const dispatch = useDispatch<AppDispatch>(); 
    const { error,status } = useSelector((state: RootState) => state.auth);

    const [disabled, setDisabled] = React.useState(false)

    const form = useForm<z.infer<typeof FormSchema>>({
        resolver: zodResolver(FormSchema),
            defaultValues: {
            pin: "",
        },
    })

    const handlePinChange = async (value: string) => {
        form.setValue("pin", value)
        if (value.length === 4) {
            const result = await dispatch(pin({ pin: value })).unwrap();
            // setDisabled(true)
            console.log("result: ",result);
            console.log("status: ",status);
        }
    }

    return (
        <Form {...form}>
            <form  className="w-full max-w-full">
                <FormField
                control={form.control}
                name="pin"
                render={({ field }) => (
                    <FormItem className='flex flex-col items-center'>
                        <InputError message={error} className="text-center" />
                        <FormControl>
                            <InputOTP 
                            maxLength={4} 
                            value={field.value} 
                            onChange={handlePinChange}
                            pattern={REGEXP_ONLY_DIGITS}
                            disabled={disabled}>
                            <InputOTPGroup>
                                <InputOTPSlot index={0} className={`h-15 w-15 text-xl ${disabled ? "opacity-50 cursor-not-allowed" : ""}`} />
                                <InputOTPSlot index={1} className={`h-15 w-15 text-xl ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}/>
                                <InputOTPSlot index={2} className={`h-15 w-15 text-xl ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}/>
                                <InputOTPSlot index={3} className={`h-15 w-15 text-xl ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}/>
                            </InputOTPGroup>
                            </InputOTP>
                        </FormControl>
                        <FormDescription>
                            {disabled ? (
                                <Spinner />
                            ) : (
                                "Please enter your PIN."
                            )}
                                                    </FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
                />
            </form>
        </Form>
    )
}

export default Pin