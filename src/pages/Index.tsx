import { Navigation } from "@/components/Navigation";

const Index = () => {
  return (
    <div className="min-h-screen bg-background text-foreground p-6 page-transition">
      <div className="max-w-lg mx-auto space-y-6 pb-20">
        <h1 className="text-2xl font-semibold mb-8 text-primary">Hey Username...</h1>
        
        <div className="message-bubble ml-auto bg-primary/10">
          <p className="text-sm">Welcome back! Ready to continue your learning journey?</p>
        </div>
        
        <div className="message-bubble">
          <p className="text-sm font-medium mb-2">Daily Motivation</p>
          <p className="text-sm text-muted-foreground">
            "The expert in anything was once a beginner. Keep pushing forward!"
          </p>
        </div>
        
        <div className="message-bubble">
          <p className="text-sm font-medium mb-2">Study Reminder</p>
          <p className="text-sm text-muted-foreground">
            You've been consistent with your study schedule. Great work!
          </p>
        </div>
      </div>
      <Navigation />
    </div>
  );
};

export default Index;