import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Car } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { error } = await signIn(email, password)
      if (error) {
        // Check if the error indicates a network/fetch error or database down
        const isNetworkErr = 
          error.message?.toLowerCase().includes('fetch') || 
          error.message?.toLowerCase().includes('network') ||
          error.message?.toLowerCase().includes('failed to fetch') ||
          error.message?.toLowerCase().includes('fetch_error') ||
          error.message?.toLowerCase().includes('unreachable') ||
          error.status === 0 || 
          error.status === 502 || 
          error.status === 503 || 
          error.status === 504
        
        if (isNetworkErr) {
          toast.loading('Supabase is down. Bypassing login with Demo Mode...')
          await signIn('demo@smartpark.com', 'password123')
          toast.dismiss()
          toast.success('Bypassed login. Welcome to Demo Mode!')
          navigate('/dashboard')
        } else {
          toast.error(error.message)
        }
      } else {
        toast.success('Welcome back!')
        navigate('/dashboard')
      }
    } catch (err) {
      toast.loading('Connection failure. Bypassing login with Demo Mode...')
      await signIn('demo@smartpark.com', 'password123')
      toast.dismiss()
      toast.success('Bypassed login. Welcome to Demo Mode!')
      navigate('/dashboard')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDemoBypass = async () => {
    setIsLoading(true)
    try {
      await signIn('demo@smartpark.com', 'password123')
      toast.success('Bypassed login. Welcome to Demo Mode!')
      navigate('/dashboard')
    } catch (err) {
      toast.error('Failed to enter Demo Mode')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center">
      <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
      >
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <Car className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Welcome Back</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Enter your email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full border-dashed border-primary/50 text-primary hover:bg-primary/5"
              onClick={handleDemoBypass}
              disabled={isLoading}
            >
              Enter Demo / Offline Mode (Bypass)
            </Button>

            <div className="mt-6 text-center text-sm">
              <span className="text-gray-600">Don't have an account? </span>
              <Link to="/register" className="text-primary hover:underline">
                Sign up
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}