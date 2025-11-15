"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from '@/i18n/routing'
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
  X,
  Settings
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useTranslations } from 'next-intl'

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  section: 'website'
  order_index: number
}

interface Article {
  id: string
  title: string
  slug: string
  content: string
  excerpt: string | null
  category_id: string | null
  section: 'website'
  status: 'draft' | 'published' | 'archived'
  order_index: number
  view_count: number
  helpful_count: number
  not_helpful_count: number
  help_categories: Category | null
  help_article_tags?: { tag: string }[]
}

export default function AdminHelpCenterPage() {
  const t = useTranslations('help')
  const tCommon = useTranslations('common')

  const [articles, setArticles] = useState<Article[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
  const [editingArticle, setEditingArticle] = useState<Article | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
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
  const [categoryFormData, setCategoryFormData] = useState({
    name: "",
    slug: "",
    description: "",
    icon: "",
    orderIndex: 0
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
      const response = await fetch("/api/help/categories?section=website")
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text()
        console.error("Expected JSON but got:", text.substring(0, 200))
        throw new Error("Response is not JSON")
      }
      
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
      const response = await fetch("/api/help/articles?section=website")
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text()
        console.error("Expected JSON but got:", text.substring(0, 200))
        throw new Error("Response is not JSON")
      }
      
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

  const handleCreateCategory = () => {
    setEditingCategory(null)
    setCategoryFormData({
      name: "",
      slug: "",
      description: "",
      icon: "",
      orderIndex: 0
    })
    setIsCategoryDialogOpen(true)
  }

  const handleSubmitArticle = async (e: React.FormEvent) => {
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
          section: "website",
          slug: formData.slug || generateSlug(formData.title),
          tags: formData.tags.filter(t => t.trim() !== "")
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text()
        console.error("Expected JSON but got:", text.substring(0, 200))
        throw new Error("Response is not JSON")
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      toast({
        title: editingArticle ? t('articleUpdated') : t('articleCreated'),
        description: editingArticle ? t('articleUpdatedSuccessfully') : t('articleCreatedSuccessfully'),
      })

      setIsDialogOpen(false)
      fetchArticles()
    } catch (error: any) {
      toast({
        title: tCommon('error'),
        description: error.message || t('failedToSaveArticle'),
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const url = "/api/help/categories"
      const method = "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...categoryFormData,
          section: "website",
          slug: categoryFormData.slug || generateSlug(categoryFormData.name),
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text()
        console.error("Expected JSON but got:", text.substring(0, 200))
        throw new Error("Response is not JSON")
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      toast({
        title: t('categoryCreated'),
        description: t('categoryCreatedSuccessfully'),
      })

      setIsCategoryDialogOpen(false)
      fetchCategories()
    } catch (error: any) {
      toast({
        title: tCommon('error'),
        description: error.message || t('failedToSaveCategory'),
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteArticle = async (articleId: string) => {
    if (!confirm(t('confirmDeleteArticle'))) {
      return
    }

    try {
      const response = await fetch(`/api/help/articles/${articleId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text()
        console.error("Expected JSON but got:", text.substring(0, 200))
        throw new Error("Response is not JSON")
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      toast({
        title: t('articleDeleted'),
        description: t('articleDeletedSuccessfully'),
      })

      fetchArticles()
    } catch (error: any) {
      toast({
        title: tCommon('error'),
        description: error.message || t('failedToDeleteArticle'),
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
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('helpCenterManagement')}</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {t('manageHelpArticlesAndCategoriesForWebsiteSection')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" onClick={handleCreateCategory}>
                    <Settings className="w-4 h-4 mr-2" />
                    {t('manageCategories')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('createCategory')}</DialogTitle>
                    <DialogDescription>
                      {t('createNewCategoryForHelpArticles')}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmitCategory}>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label htmlFor="categoryName">{t('nameLabel')} *</Label>
                        <Input
                          id="categoryName"
                          value={categoryFormData.name}
                          onChange={(e) => {
                            setCategoryFormData(prev => ({
                              ...prev,
                              name: e.target.value,
                              slug: prev.slug || generateSlug(e.target.value)
                            }))
                          }}
                          placeholder={t('categoryName')}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="categorySlug">{t('slugLabel')} *</Label>
                        <Input
                          id="categorySlug"
                          value={categoryFormData.slug}
                          onChange={(e) => setCategoryFormData(prev => ({ ...prev, slug: e.target.value }))}
                          placeholder={t('categorySlug')}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="categoryDescription">{t('descriptionLabel')}</Label>
                        <Textarea
                          id="categoryDescription"
                          value={categoryFormData.description}
                          onChange={(e) => setCategoryFormData(prev => ({ ...prev, description: e.target.value }))}
                          placeholder={t('categoryDescription')}
                          rows={2}
                        />
                      </div>
                      <div>
                        <Label htmlFor="categoryIcon">{t('iconLabel')}</Label>
                        <Input
                          id="categoryIcon"
                          value={categoryFormData.icon}
                          onChange={(e) => setCategoryFormData(prev => ({ ...prev, icon: e.target.value }))}
                          placeholder={t('iconNameEgBookOpen')}
                        />
                      </div>
                      <div>
                        <Label htmlFor="categoryOrder">{t('orderIndex')}</Label>
                        <Input
                          id="categoryOrder"
                          type="number"
                          value={categoryFormData.orderIndex}
                          onChange={(e) => setCategoryFormData(prev => ({ ...prev, orderIndex: parseInt(e.target.value) || 0 }))}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
                        {tCommon('cancel')}
                      </Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? t('creating') : t('createCategory')}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={handleCreateArticle}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t('createArticle')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingArticle ? t('editArticle') : t('createNewArticle')}
                    </DialogTitle>
                    <DialogDescription>
                      {editingArticle
                        ? t('updateArticleDescription')
                        : t('createArticleDescription')}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmitArticle}>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label htmlFor="title">{t('titleLabel')} *</Label>
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
                          placeholder={t('enterArticleTitle')}
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="slug">{t('slugLabel')} *</Label>
                        <Input
                          id="slug"
                          value={formData.slug}
                          onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                          placeholder={t('articleSlug')}
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="category">{t('categoryLabel')}</Label>
                        <Select
                          value={formData.categoryId || "none"}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, categoryId: value === "none" ? "" : value }))}
                        >
                          <SelectTrigger id="category">
                            <SelectValue placeholder={t('selectCategoryOptional')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">{t('noCategory')}</SelectItem>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="excerpt">{t('excerpt')}</Label>
                        <Textarea
                          id="excerpt"
                          value={formData.excerpt}
                          onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
                          placeholder={t('shortDescriptionOfArticle')}
                          rows={2}
                        />
                      </div>

                      <div>
                        <Label htmlFor="content">{t('contentLabel')} *</Label>
                        <Textarea
                          id="content"
                          value={formData.content}
                          onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                          placeholder={t('articleContentSupportsHtmlMarkdown')}
                          rows={10}
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="status">{tCommon('status')}</Label>
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
                              <SelectItem value="draft">{tCommon('draft')}</SelectItem>
                              <SelectItem value="published">{tCommon('published')}</SelectItem>
                              <SelectItem value="archived">{t('archived')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="orderIndex">{t('orderIndex')}</Label>
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
                        <Label htmlFor="tags">{t('tagsCommaSeparated')}</Label>
                        <Input
                          id="tags"
                          value={formData.tags.join(", ")}
                          onChange={(e) =>
                            setFormData(prev => ({
                              ...prev,
                              tags: e.target.value.split(",").map(t => t.trim()).filter(t => t !== "")
                            }))
                          }
                          placeholder={t('tag1Tag2Tag3')}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        {tCommon('cancel')}
                      </Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? t('saving') : editingArticle ? t('updateArticle') : t('createArticle')}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder={t('searchArticles')}
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
                    <SelectItem value="all">{t('allStatus')}</SelectItem>
                    <SelectItem value="published">{tCommon('published')}</SelectItem>
                    <SelectItem value="draft">{tCommon('draft')}</SelectItem>
                    <SelectItem value="archived">{t('archived')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Articles List */}
          {loading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-gray-600 dark:text-gray-400">{t('loadingArticles')}</p>
              </CardContent>
            </Card>
          ) : filteredArticles.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t('noArticles')}</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {searchTerm || selectedStatus !== "all"
                    ? t('tryAdjustingYourFilters')
                    : t('createFirstHelpArticleToGetStarted')}
                </p>
                {!searchTerm && selectedStatus === "all" && (
                  <Button onClick={handleCreateArticle}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t('createArticle')}
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
                            {article.status === "published" 
                              ? tCommon('published')
                              : article.status === "draft"
                              ? tCommon('draft')
                              : t('archived')}
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
                          <span>{article.view_count || 0} {t('views')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <FileText className="w-4 h-4" />
                          <span>{t('orderLabel')}: {article.order_index}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditArticle(article)}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          {t('edit')}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteArticle(article.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          {t('delete')}
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

