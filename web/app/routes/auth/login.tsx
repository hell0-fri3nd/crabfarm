
import React from 'react'
import { 
  Input, 
  Button, 
  Checkbox,
  Label
} from '~/components/ui';
import type { AppDispatch, RootState } from "../../store/store";
import { useDispatch, useSelector } from 'react-redux';
import { login } from '~/store/auth/auth-slice';
import InputError from '~/components/input-error';
import { useNavigate } from 'react-router';

const LoginIndex = () => {

  const { error } = useSelector((state: RootState) => state.auth);

  const [user, setUser] = React.useState({
    email: '',
    password: ''
  });

  const dispatch = useDispatch<AppDispatch>(); 
  const navigate = useNavigate();


  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    try {
      e.preventDefault(); 
      const result = await dispatch(login({ email: user.email, password: user.password, remember_me: false })).unwrap();
      navigate('/page/dashboard');
    } catch (err: unknown) {
      console.log('Login failed:', err);
    }
    
  };

  return (
    <form className="flex flex-col gap-6 w-full max-w-full" onSubmit={handleLogin}>

      <div className="grid gap-6  w-full">

        <div className="grid gap-2 w-full">
          <Label htmlFor='email'>Email</Label>
          <Input 
          type='email' 
          id='email' 
          className='w-full h-12 text-base px-4' 
          placeholder='Enter your email' 
          value={user.email}
          onChange={(e) => setUser({ ...user, email: e.target.value })}
          required/>

        </div>

        <div className="grid gap-2 w-full">
          <Label htmlFor='password'>Password</Label>
          <Input 
          type='password' 
          id='password' 
          className='w-full h-12 text-base px-4' 
          placeholder='Enter your password' 
          value={user.password}
          onChange={(e) => setUser({ ...user, password: e.target.value })}
          required/>
          <InputError message={error} />
        </div>

        <div className="flex items-center justify-between w-full">

          <div className="flex items-center space-x-2">
            <Checkbox id="remember-me" />
            <Label htmlFor="remember-me">Remember Me for 30 days</Label>
          </div>

          {/* <Button variant="link" className="text-sm font-medium">
            Forgot password?
          </Button> */}
        </div>

        <Button className="w-full" type='submit'>Login</Button>
                  
      </div>
    </form>
  )
}

export default LoginIndex