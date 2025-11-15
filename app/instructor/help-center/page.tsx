"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Plus,
  Edit,
  Trash2,
  BookOpen,
  Search,
  Eye,
  FileText,
  Save,
  X
} from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  section: 'courses'
  order_index: number
}

interface Article {
  id: string
  title: string
  slug: string
  content: string
  excerpt: string | null
  category_id: string | null
  section: 'courses'
  status: 'draft' | 'published' | 'archived'
  order_index: number
  view_count: number
  helpful_count: number
  not_helpful_count: number
  help_categories: Category | null
  help_article_tags?: { tag: string }[]
}

export default function InstructorHelpCenterPage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingArticle, setEditingArticle] = useState<Article | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    content: "",
    excerpt: "",
    categoryId: "",
    status: "draft" as 'draft' | 'published' | 'archived',
    orderIndex: 0,
    tags: [] as string[]
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchCategories()
    fetchArticles()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/help/categories?section=courses")
      const data = await response.json()
      if (data.categories) {
        setCategories(data.categories)
      }
    } catch (error) {
      console.error("Error fetching categories:", error)
    }
  }

  const fetchArticles = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/help/articles?section=courses")
      const data = await response.json()
      if (data.articles) {
        setArticles(data.articles)
      }
    } catch (error) {
      console.error("Error fetching articles:", error)
      toast({
        title: "Error",
        description: "Failed to fetch articles.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
  }

  const handleCreateArticle = () => {
    setEditingArticle(null)
    setFormData({
      title: "",
      slug: "",
      content: "",
      excerpt: "",
      categoryId: "",
      status: "draft",
      orderIndex: 0,
      tags: []
    })
    setIsDialogOpen(true)
  }

  const handleEditArticle = (article: Article) => {
    setEditingArticle(article)
    setFormData({
      title: article.title,
      slug: article.slug,
      content: article.content,
      excerpt: article.excerpt || "",
      categoryId: article.category_id || "",
      status: article.status,
      orderIndex: article.order_index,
      tags: article.help_article_tags?.map(t => t.tag) || []
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const url = editingArticle
        ? `/api/help/articles/${editingArticle.id}`
        : "/api/help/articles"

      const method = editingArticle ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          section: "courses",
          slug: formData.slug || generateSlug(formData.title),
          tags: formData.tags.filter(t => t.trim() !== "")
        }),
      })

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      toast({
        title: editingArticle ? "Article updated" : "Article created",
        description: `Your article has been ${editingArticle ? "updated" : "created"} successfully.`,
      })

      setIsDialogOpen(false)
      fetchArticles()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save article.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteArticle = async (articleId: string) => {
    if (!confirm("Are you sure you want to delete this article?")) {
      return
    }

    try {
      const response = await fetch(`/api/help/articles/${articleId}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      toast({
        title: "Article deleted",
        description: "The article has been deleted successfully.",
      })

      fetchArticles()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete article.",
        variant: "destructive",
      })
    }
  }

  const filteredArticles = articles.filter((article) => {
    const matchesSearch =
      article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.excerpt?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.content.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = selectedStatus === "all" || article.status === selectedStatus
    return matchesSearch && matchesStatus
  })

  return (
    <div className="max-w-7xl mx-auto">
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Help Center Management</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Manage help articles for courses section
              </p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleCreateArticle}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Article
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingArticle ? "Edit Article" : "Create New Article"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingArticle
                      ? "Update the article details below."
                      : "Fill in the details to create a new help article."}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => {
                          setFormData(prev => ({
                            ...prev,
                            title: e.target.value,
                            slug: prev.slug || generateSlug(e.target.value)
                          }))
                        }}
                        placeholder="Enter article title"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="slug">Slug *</Label>
                      <Input
                        id="slug"
                        value={formData.slug}
                        onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                        placeholder="article-slug"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select
                        value={formData.categoryId || "none"}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, categoryId: value === "none" ? "" : value }))}
                      >
                        <SelectTrigger id="category">
                          <SelectValue placeholder="Select a category (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No category</SelectItem>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="excerpt">Excerpt</Label>
                      <Textarea
                        id="excerpt"
                        value={formData.excerpt}
                        onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
                        placeholder="Short description of the article"
                        rows={2}
                      />
                    </div>

                    <div>
                      <Label htmlFor="content">Content *</Label>
                      <Textarea
                        id="content"
                        value={formData.content}
                        onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                        placeholder="Article content (supports HTML/Markdown)"
                        rows={10}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="status">Status</Label>
                        <Select
                          value={formData.status}
                          onValueChange={(value: 'draft' | 'published' | 'archived') =>
                            setFormData(prev => ({ ...prev, status: value }))
                          }
                        >
                          <SelectTrigger id="status">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="published">Published</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="orderIndex">Order Index</Label>
                        <Input
                          id="orderIndex"
                          type="number"
                          value={formData.orderIndex}
                          onChange={(e) =>
                            setFormData(prev => ({ ...prev, orderIndex: parseInt(e.target.value) || 0 }))
                          }
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="tags">Tags (comma-separated)</Label>
                      <Input
                        id="tags"
                        value={formData.tags.join(", ")}
                        onChange={(e) =>
                          setFormData(prev => ({
                            ...prev,
                            tags: e.target.value.split(",").map(t => t.trim()).filter(t => t !== "")
                          }))
                        }
                        placeholder="tag1, tag2, tag3"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Saving..." : editingArticle ? "Update Article" : "Create Article"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search articles..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Articles List */}
          {loading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-gray-600 dark:text-gray-400">Loading articles...</p>
              </CardContent>
            </Card>
          ) : filteredArticles.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No articles found</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {searchTerm || selectedStatus !== "all"
                    ? "Try adjusting your filters"
                    : "Create your first help article to get started"}
                </p>
                {!searchTerm && selectedStatus === "all" && (
                  <Button onClick={handleCreateArticle}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Article
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredArticles.map((article) => (
                <Card key={article.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge
                            variant={
                              article.status === "published"
                                ? "default"
                                : article.status === "draft"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {article.status}
                          </Badge>
                          {article.help_categories && (
                            <Badge variant="outline">{article.help_categories.name}</Badge>
                          )}
                        </div>
                        <CardTitle className="text-lg">{article.title}</CardTitle>
                        {article.excerpt && (
                          <CardDescription className="mt-2">{article.excerpt}</CardDescription>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          <span>{article.view_count || 0} views</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <FileText className="w-4 h-4" />
                          <span>Order: {article.order_index}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditArticle(article)}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteArticle(article.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
    </div>
  )
}

