import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function App() {
  return (
    <div className="flex min-h-svh items-center justify-center p-8">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Quiz Night</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Project scaffolding complete. shadcn/ui is wired up.
          </p>
          <Button>It works</Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default App
