import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Car, User, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { useAuth } from '@/hooks/useAuth'

export function Navbar() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="glass-effect shadow-soft border-b sticky top-0 z-50 transition-colors duration-300"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2 group">
              <motion.div
                whileHover={{ scale: 1.05, rotate: 5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Car className="h-8 w-8 text-primary" />
              </motion.div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-500 via-purple-600 to-violet-600 bg-clip-text text-transparent group-hover:scale-105 transition-transform">
                SmartPark
              </span>
            </Link>
          </div>

          <div className="flex items-center space-x-2">
            <ThemeToggle />
            {user ? (
              <>
                <Link to="/dashboard">
                  <Button variant="ghost" className="hover:shadow-soft transition-all">
                    Dashboard
                  </Button>
                </Link>
                <Link to="/map">
                  <Button variant="ghost" className="hover:shadow-soft transition-all">
                    Map
                  </Button>
                </Link>
                <Link to="/profile">
                  <Button variant="ghost" size="icon" className="hover:shadow-soft transition-all">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-gradient-to-br from-primary/10 to-secondary/20">
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </Link>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleSignOut}
                  className="hover:shadow-soft hover:text-destructive transition-all"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" className="hover:shadow-soft transition-all">
                    Login
                  </Button>
                </Link>
                <Link to="/register">
                  <Button className="gradient-primary text-primary-foreground hover:shadow-medium transition-all">
                    Register
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.nav>
  )
}