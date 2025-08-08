import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle2, XCircle, Info } from 'lucide-react';

const ShadcnStaticDemo: React.FC = () => {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">shadcn/ui Component Test</h1>
          <p className="text-muted-foreground">
            This is a static demo to verify that shadcn/ui components are rendering correctly
          </p>
        </div>

        <Separator />

        {/* Badges Section */}
        <Card>
          <CardHeader>
            <CardTitle>Badge Components</CardTitle>
            <CardDescription>Various badge styles and variants</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-3">Basic Variants</h3>
              <div className="flex flex-wrap gap-2">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="destructive">Destructive</Badge>
                <Badge variant="outline">Outline</Badge>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium mb-3">With Icons</h3>
              <div className="flex flex-wrap gap-2">
                <Badge className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Success
                </Badge>
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  Error
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <Info className="h-3 w-3" />
                  Info
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Buttons Section */}
        <Card>
          <CardHeader>
            <CardTitle>Button Components</CardTitle>
            <CardDescription>Different button variants and sizes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-3">Variants</h3>
              <div className="flex flex-wrap gap-2">
                <Button>Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="link">Link</Button>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium mb-3">Sizes</h3>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm">Small</Button>
                <Button size="default">Default</Button>
                <Button size="lg">Large</Button>
                <Button size="icon">
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alerts Section */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Alert Components</h2>
          
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Default Alert</AlertTitle>
            <AlertDescription>
              This is a default alert with an icon, title, and description.
            </AlertDescription>
          </Alert>

          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Error Alert</AlertTitle>
            <AlertDescription>
              Something went wrong! Please try again later.
            </AlertDescription>
          </Alert>
        </div>

        {/* Form Elements */}
        <Card>
          <CardHeader>
            <CardTitle>Form Elements</CardTitle>
            <CardDescription>Input fields and form controls</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="Enter your email" />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox id="terms" />
              <Label htmlFor="terms" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Accept terms and conditions
              </Label>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full">Submit Form</Button>
          </CardFooter>
        </Card>

        {/* Tabs Component */}
        <Card>
          <CardHeader>
            <CardTitle>Tabs Component</CardTitle>
            <CardDescription>Interactive tab navigation</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="account" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="account">Account</TabsTrigger>
                <TabsTrigger value="password">Password</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
              <TabsContent value="account" className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Account Information</h3>
                  <p className="text-sm text-muted-foreground">
                    Make changes to your account here. Click save when you're done.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" defaultValue="John Doe" />
                </div>
              </TabsContent>
              <TabsContent value="password" className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Password Settings</h3>
                  <p className="text-sm text-muted-foreground">
                    Change your password here. After saving, you'll be logged out.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="current">Current password</Label>
                  <Input id="current" type="password" />
                </div>
              </TabsContent>
              <TabsContent value="settings" className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">General Settings</h3>
                  <p className="text-sm text-muted-foreground">
                    Manage your general application settings and preferences.
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="notifications" />
                  <Label htmlFor="notifications">Enable notifications</Label>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Color Palette Test */}
        <Card>
          <CardHeader>
            <CardTitle>Color Palette Test</CardTitle>
            <CardDescription>Testing CSS variables are working correctly</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="h-16 rounded bg-primary"></div>
                <p className="text-sm">Primary</p>
              </div>
              <div className="space-y-2">
                <div className="h-16 rounded bg-secondary"></div>
                <p className="text-sm">Secondary</p>
              </div>
              <div className="space-y-2">
                <div className="h-16 rounded bg-destructive"></div>
                <p className="text-sm">Destructive</p>
              </div>
              <div className="space-y-2">
                <div className="h-16 rounded bg-muted"></div>
                <p className="text-sm">Muted</p>
              </div>
              <div className="space-y-2">
                <div className="h-16 rounded bg-accent"></div>
                <p className="text-sm">Accent</p>
              </div>
              <div className="space-y-2">
                <div className="h-16 rounded bg-card border"></div>
                <p className="text-sm">Card</p>
              </div>
              <div className="space-y-2">
                <div className="h-16 rounded bg-popover border"></div>
                <p className="text-sm">Popover</p>
              </div>
              <div className="space-y-2">
                <div className="h-16 rounded border-2 border-border"></div>
                <p className="text-sm">Border</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ShadcnStaticDemo;