"use client"

import * as React from "react"
import { Network, RefreshCw, Share2, ZoomIn, Info, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useTenantContext } from "@/lib/tenant-context"
import { getGraphVisualize, rebuildGraph } from "@/lib/api"

export default function KnowledgeGraphPage() {
  const { activeTenant } = useTenantContext()
  const [graphImage, setGraphImage] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [generating, setGenerating] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const fetchGraph = React.useCallback(async () => {
    if (!activeTenant) return
    setLoading(true)
    setError(null)
    try {
      const data = await getGraphVisualize(activeTenant.bot_id)
      if (data.status === "success" && data.image) {
        setGraphImage(data.image)
      } else {
        setGraphImage(null)
      }
    } catch (e) {
      setError("Failed to load knowledge network.")
    } finally {
      setLoading(false)
    }
  }, [activeTenant])

  const generateGraph = async () => {
    if (!activeTenant) return
    setGenerating(true)
    setError(null)
    try {
      const res = await rebuildGraph(activeTenant.bot_id)
      if (res.status === "accepted") {
        // Since it's a background task, we wait a bit then poll
        setTimeout(fetchGraph, 7000)
      } else {
        setError("Failed to trigger graph generation.")
      }
    } catch (e) {
      setError("Error communicating with intelligence engine.")
    } finally {
      setGenerating(false)
    }
  }

  React.useEffect(() => {
    fetchGraph()
  }, [fetchGraph])

  if (!activeTenant) {
    return (
      <div className="py-2">
        <h1 className="text-2xl font-semibold">Knowledge Graph</h1>
        <Alert className="mt-6" variant="destructive">
          <AlertTitle>Select a bot first</AlertTitle>
          <AlertDescription>Choose a bot from the sidebar to visualize its intelligence network.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 py-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Knowledge Network</h1>
          <p className="text-sm text-muted-foreground">
            Visualizing semantic relations for <span className="font-medium text-foreground">{activeTenant.name}</span>
          </p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" size="sm" onClick={fetchGraph} disabled={loading}>
             <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
             Refresh
           </Button>
           <Button size="sm" onClick={generateGraph} disabled={generating || loading}>
             {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Network className="mr-2 h-4 w-4" />}
             {graphImage ? "Rebuild Graph" : "Generate Graph"}
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-3 overflow-hidden border-none shadow-2xl bg-slate-900/50 backdrop-blur-xl">
           <CardHeader className="border-b border-white/10 bg-white/5">
             <div className="flex items-center justify-between">
               <CardTitle className="text-lg text-white font-bold flex items-center gap-2">
                 <div className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
                 Relational Map
               </CardTitle>
               <div className="flex gap-1">
                  <div className="h-6 w-6 rounded bg-white/10 flex items-center justify-center cursor-pointer hover:bg-white/20 transition-colors">
                    <ZoomIn className="h-3 w-3 text-white/70" />
                  </div>
                  <div className="h-6 w-6 rounded bg-white/10 flex items-center justify-center cursor-pointer hover:bg-white/20 transition-colors">
                    <Share2 className="h-3 w-3 text-white/70" />
                  </div>
               </div>
             </div>
           </CardHeader>
           <CardContent className="p-0 flex items-center justify-center min-h-[500px] relative">
              {loading ? (
                <div className="flex flex-col items-center gap-4 text-white/50">
                  <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
                  <p className="font-medium">Syncing Network Nodes...</p>
                </div>
              ) : graphImage ? (
                <img 
                  src={`data:image/png;base64,${graphImage}`} 
                  alt="Knowledge Graph" 
                  className="w-full h-auto object-contain max-h-[700px] transition-all hover:scale-[1.02]"
                />
              ) : (
                <div className="flex flex-col items-center gap-6 text-center max-w-md px-6 py-20">
                   <div className="h-20 w-20 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                      <Network className="h-10 w-10 text-purple-400" />
                   </div>
                   <div>
                      <h3 className="text-xl font-bold text-white mb-2">No Knowledge Map Generated</h3>
                      <p className="text-white/60 text-sm leading-relaxed">
                        The intelligence engine hasn't parsed your documents into a relational network yet. 
                        Click "Generate Graph" to build your semantic hub.
                      </p>
                   </div>
                   <Button onClick={generateGraph} variant="secondary" className="bg-purple-600 hover:bg-purple-700 text-white border-none px-8">
                     Build Intelligence Network
                   </Button>
                </div>
              )}
              
              <div className="absolute bottom-4 left-4 flex gap-2">
                 <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/30 backdrop-blur-md">
                    <div className="h-2 w-2 rounded-full bg-purple-400" />
                    <span className="text-[10px] text-purple-200 font-bold tracking-widest uppercase">Nodes: Entity Clusters</span>
                 </div>
                 <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20 border border-blue-500/30 backdrop-blur-md">
                    <div className="h-2 w-2 rounded-full bg-blue-400" />
                    <span className="text-[10px] text-blue-200 font-bold tracking-widest uppercase">Edges: Semantic Links</span>
                 </div>
              </div>
           </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
           <Card className="bg-white/5 border-white/10 backdrop-blur-lg">
             <CardHeader>
               <CardTitle className="text-sm font-bold flex items-center gap-2">
                 <Info className="h-4 w-4 text-purple-400" />
                 Intelligence Specs
               </CardTitle>
             </CardHeader>
             <CardContent className="space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                   <span className="text-xs text-white/50">Provider</span>
                   <span className="text-xs font-bold text-white uppercase italic tracking-tighter">Graph Engine 1.0</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                   <span className="text-xs text-white/50">Architecture</span>
                   <span className="text-xs font-bold text-white italic tracking-tighter">NetworkX Hybrid</span>
                </div>
                <div className="space-y-1 pt-2">
                   <p className="text-[10px] text-white/40 uppercase font-black">Optimization Tips</p>
                   <p className="text-xs text-white/60 leading-relaxed">
                     Well-structured PDFs and Markdown files result in denser, more interconnected graphs.
                   </p>
                </div>
             </CardContent>
           </Card>

           <Alert className="bg-blue-500/10 border-blue-500/20 text-blue-200">
             <Info className="h-4 w-4" />
             <AlertTitle className="text-xs font-bold">Network Insight</AlertTitle>
             <AlertDescription className="text-[10px] opacity-80 leading-relaxed">
               The graph visualizes how information segments link together. Highly connected nodes represent "Single Source of Truth" clusters in your data.
             </AlertDescription>
           </Alert>
        </div>
      </div>
    </div>
  )
}
