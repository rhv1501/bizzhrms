"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { FileText, Upload, ShieldCheck, Trash2, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { loadDocuments, uploadDocument, deleteDocument, DocumentItem, loadAdminEmployeesSnapshot } from "@/lib/hrms/live";
import { format } from "date-fns";

export default function AdminDocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [employees, setEmployees] = useState<{ id: string, name: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [newDoc, setNewDoc] = useState<{ title: string; file: File | null; userId: string | "all" }>({
    title: "",
    file: null,
    userId: "all",
  });
  const [isOpen, setIsOpen] = useState(false);

  const fetchDocs = () => {
    loadDocuments().then(setDocuments).catch(console.error);
  };

  useEffect(() => {
    fetchDocs();
    loadAdminEmployeesSnapshot().then(s => setEmployees(s.employees)).catch(console.error);
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoc.file) return toast.error("Please select a file");
    if (!newDoc.title) return toast.error("Please enter a title");

    setIsUploading(true);
    try {
      await uploadDocument(newDoc.title, newDoc.file, newDoc.userId === "all" ? null : newDoc.userId);
      toast.success("Document uploaded successfully");
      setIsOpen(false);
      setNewDoc({ title: "", file: null, userId: "all" });
      fetchDocs();
    } catch (error: any) {
      toast.error(error.message || "Failed to upload document");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    try {
      await deleteDocument(id);
      toast.success("Document deleted");
      fetchDocs();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete");
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Document Vault</h1>
          <p className="text-muted-foreground mt-1">Manage company policies and employee-specific documents.</p>
        </div>
        <Button className="gap-2" onClick={() => setIsOpen(true)}>
          <Upload className="w-4 h-4" />
          Upload Document
        </Button>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload New Document</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpload} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Document Title</Label>
                <Input required value={newDoc.title} onChange={e => setNewDoc({ ...newDoc, title: e.target.value })} placeholder="e.g. Employee Handbook 2026" />
              </div>
              <div className="space-y-2">
                <Label>Assign To</Label>
                <Select value={newDoc.userId} onValueChange={v => setNewDoc({ ...newDoc, userId: v || "all" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Company Policy (All Employees)</SelectItem>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>File</Label>
                <Input required type="file" onChange={e => setNewDoc({ ...newDoc, file: e.target.files?.[0] || null })} />
              </div>
              <Button type="submit" className="w-full" disabled={isUploading}>
                {isUploading ? "Uploading..." : "Upload"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Documents</CardTitle>
          <CardDescription>View and manage all documents currently in the vault</CardDescription>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No documents uploaded yet.</div>
          ) : (
            <div className="space-y-4">
              {documents.map(doc => (
                <div key={doc.id} className="flex flex-col sm:flex-row justify-between sm:items-center p-4 border rounded-lg hover:bg-muted/30 transition-colors gap-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-primary/10 text-primary rounded-lg">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{doc.title}</h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        {doc.userId ? (
                          <span className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded-full"><Users className="w-3 h-3" /> {doc.employeeName}</span>
                        ) : (
                          <span className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-full"><ShieldCheck className="w-3 h-3" /> Company Policy</span>
                        )}
                        <span>•</span>
                        <span>{format(new Date(doc.createdAt), "MMM d, yyyy")}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button variant="outline" size="sm" onClick={() => window.open(doc.fileUrl, '_blank')}>
                      View
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(doc.id)} className="text-destructive hover:bg-destructive/10">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
