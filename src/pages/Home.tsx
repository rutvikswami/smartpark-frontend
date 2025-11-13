import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Car, MapPin, Clock, Shield, Sparkles, Zap, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'

export function Home() {
  const { user } = useAuth()

  const features = [
    {
      icon: MapPin,
      title: 'Real-time Monitoring',
      description: 'Track parking slot availability in real-time across multiple locations with live updates',
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      icon: Clock,
      title: 'Smart Predictions',
      description: 'AI-powered predictions help you find parking before you arrive, saving time and fuel',
      gradient: 'from-purple-500 to-pink-500'
    },
    {
      icon: Shield,
      title: 'Secure Reservations',
      description: 'Reserve your spot in advance with guaranteed availability and secure payment processing',
      gradient: 'from-green-500 to-emerald-500'
    }
  ]

  const stats = [
    { number: '10K+', label: 'Happy Users', icon: Star },
    { number: '50+', label: 'Parking Locations', icon: MapPin },
    { number: '99.9%', label: 'Uptime', icon: Zap },
  ]

  return (
    <div className="space-y-20">
      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-8 relative"
      >
        {/* Background Elements */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-20 left-10 w-20 h-20 bg-primary/10 rounded-full blur-xl animate-pulse" />
          <div className="absolute top-40 right-20 w-32 h-32 bg-secondary/20 rounded-full blur-2xl animate-pulse delay-300" />
          <div className="absolute bottom-20 left-1/4 w-24 h-24 bg-accent/15 rounded-full blur-xl animate-pulse delay-700" />
        </div>

        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="inline-flex items-center space-x-4 text-6xl md:text-7xl"
        >
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <Car className="text-primary drop-shadow-lg" />
          </motion.div>
          <span className="font-bold text-gradient">SmartPark</span>
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Sparkles className="text-primary h-12 w-12" />
          </motion.div>
        </motion.div>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed"
        >
          The intelligent parking solution that revolutionizes how you find, reserve, and manage parking spots 
          with <span className="text-primary font-semibold">real-time availability</span> and <span className="text-primary font-semibold">AI-powered predictions</span>.
        </motion.p>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          {user ? (
            <Link to="/dashboard">
              <Button size="lg" className="gradient-primary text-primary-foreground hover:shadow-large transition-all text-lg px-8 py-6">
                Go to Dashboard
              </Button>
            </Link>
          ) : (
            <>
              <Link to="/register">
                <Button size="lg" className="gradient-primary text-primary-foreground hover:shadow-large transition-all text-lg px-8 py-6">
                  Get Started Free
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="lg" className="hover:shadow-medium transition-all text-lg px-8 py-6">
                  Sign In
                </Button>
              </Link>
            </>
          )}
        </motion.div>

        {/* Stats Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex flex-col sm:flex-row justify-center items-center gap-8 pt-8"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8 + index * 0.1 }}
              className="text-center"
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <stat.icon className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold text-gradient">{stat.number}</span>
              </div>
              <span className="text-muted-foreground">{stat.label}</span>
            </motion.div>
          ))}
        </motion.div>
      </motion.section>

      {/* Features Section */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="space-y-12"
      >
        <div className="text-center space-y-4">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl font-bold text-gradient"
          >
            Why Choose SmartPark?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            Experience the future of parking with our cutting-edge features designed to make your life easier
          </motion.p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2 }}
              whileHover={{ y: -8 }}
            >
              <Card className="h-full card-hover shadow-soft border-0 bg-card/50 backdrop-blur-sm">
                <CardHeader className="text-center pb-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.2 + 0.3, type: "spring", stiffness: 200 }}
                    className={`mx-auto w-16 h-16 bg-gradient-to-br ${feature.gradient} rounded-2xl flex items-center justify-center mb-6 shadow-medium`}
                  >
                    <feature.icon className="h-8 w-8 text-white" />
                  </motion.div>
                  <CardTitle className="text-xl font-semibold">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-center leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* CTA Section */}
      <motion.section
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="animated-gradient rounded-3xl p-12 md:p-16 text-center shadow-large relative overflow-hidden"
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 border border-white/20 rounded-full" />
          <div className="absolute bottom-10 right-10 w-24 h-24 border border-white/20 rounded-full" />
          <div className="absolute top-1/2 left-1/4 w-16 h-16 border border-white/20 rounded-full" />
        </div>
        
        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Ready to Park Smarter?
            </h2>
            <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-2xl mx-auto">
              Join thousands of users who have revolutionized their parking experience with SmartPark.
            </p>
            {!user && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                <Link to="/register">
                  <Button 
                    size="lg" 
                    variant="secondary" 
                    className="text-lg px-8 py-6 hover:shadow-large transition-all bg-white text-primary hover:bg-white/90"
                  >
                    Start Your Free Trial
                  </Button>
                </Link>
              </motion.div>
            )}
          </motion.div>
        </div>
      </motion.section>
    </div>
  )
}