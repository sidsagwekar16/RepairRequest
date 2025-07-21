import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Edit, Building, Wrench, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";

const buildingSchema = z.object({
  name: z.string().min(1, "Building name is required"),
  address: z.string().optional(),
  description: z.string().optional(),
  roomNumbers: z.array(z.string()).default([]),
});

const laborSchema = z.object({
  name: z.string().min(1, "Labor name is required"),
  description: z.string().optional(),
  availableItems: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    category: z.string().optional(),
  })).default([]),
});

type BuildingFormValues = z.infer<typeof buildingSchema>;
type LaborFormValues = z.infer<typeof laborSchema>;

export default function AdminBuildingsLabors() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedOrganization, setSelectedOrganization] = useState<number | null>(null);

  // Only super admins can access this page
  if (user?.role !== 'super_admin') {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
            <p className="text-gray-500">
              Only super administrators can manage buildings and facilities.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [buildingDialogOpen, setBuildingDialogOpen] = useState(false);
  const [laborDialogOpen, setLaborDialogOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<any>(null);
  const [editingLabor, setEditingLabor] = useState<any>(null);

  // Room management for buildings
  const [newRoom, setNewRoom] = useState("");
  const [laborItems, setLaborItems] = useState<Array<{name: string, description?: string, category?: string}>>([]);
  const [newItem, setNewItem] = useState({name: "", description: "", category: ""});

  // Fetch organizations
  const { data: organizations, isLoading: organizationsLoading, error: organizationsError } = useQuery({
    queryKey: ["/api/admin/organizations"],
  });

  // Debug logging
  console.log("Organizations data:", organizations);
  console.log("Organizations loading:", organizationsLoading);
  console.log("Organizations error:", organizationsError);

  // Fetch buildings for selected organization
  const { data: buildings, refetch: refetchBuildings } = useQuery({
    queryKey: [`/api/admin/buildings/${selectedOrganization}`],
    enabled: !!selectedOrganization,
  });

  // Fetch facilities for selected organization
  const { data: labors, refetch: refetchLabors } = useQuery({
    queryKey: [`/api/admin/labors/${selectedOrganization}`],
    enabled: !!selectedOrganization,
  });

  const buildingForm = useForm<BuildingFormValues>({
    resolver: zodResolver(buildingSchema),
    defaultValues: {
      name: "",
      address: "",
      description: "",
      roomNumbers: [],
    },
  });

  const laborForm = useForm<LaborFormValues>({
    resolver: zodResolver(laborSchema),
    defaultValues: {
      name: "",
      description: "",
      availableItems: [],
    },
  });

  // Building mutations
  const createBuildingMutation = useMutation({
    mutationFn: (data: BuildingFormValues) => 
      apiRequest("POST", "/api/admin/buildings", { ...data, organizationId: selectedOrganization }),
    onSuccess: () => {
      toast({ title: "Building created successfully" });
      setBuildingDialogOpen(false);
      buildingForm.reset();
      refetchBuildings();
    },
  });

  const updateBuildingMutation = useMutation({
    mutationFn: (data: BuildingFormValues) => 
      apiRequest("PATCH", `/api/admin/buildings/${editingBuilding.id}`, data),
    onSuccess: () => {
      toast({ title: "Building updated successfully" });
      setBuildingDialogOpen(false);
      buildingForm.reset();
      setEditingBuilding(null);
      refetchBuildings();
    },
  });

  const deleteBuildingMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest("DELETE", `/api/admin/buildings/${id}`),
    onSuccess: () => {
      toast({ title: "Building deleted successfully" });
      refetchBuildings();
    },
  });

  // Labor mutations
  const createLaborMutation = useMutation({
    mutationFn: (data: LaborFormValues) => 
      apiRequest("POST", "/api/admin/labors", { ...data, organizationId: selectedOrganization }),
    onSuccess: () => {
      toast({ title: "Labor created successfully" });
      setLaborDialogOpen(false);
      laborForm.reset();
      setLaborItems([]);
      refetchLabors();
    },
  });

  const updateLaborMutation = useMutation({
    mutationFn: (data: LaborFormValues) => 
      apiRequest("PATCH", `/api/admin/labors/${editingLabor.id}`, data),
    onSuccess: () => {
      toast({ title: "Labor updated successfully" });
      setLaborDialogOpen(false);
      laborForm.reset();
      setEditingLabor(null);
      setLaborItems([]);
      refetchLabors();
    },
  });

  const deleteLaborMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest("DELETE", `/api/admin/labors/${id}`),
    onSuccess: () => {
      toast({ title: "Labor deleted successfully" });
      refetchLabors();
    },
  });

  const handleCreateBuilding = (data: BuildingFormValues) => {
    createBuildingMutation.mutate(data);
  };

  const handleUpdateBuilding = (data: BuildingFormValues) => {
    updateBuildingMutation.mutate(data);
  };

  const handleCreateLabor = (data: LaborFormValues) => {
    const laborData = {
      ...data,
      availableItems: laborItems,
    };
    createLaborMutation.mutate(laborData);
  };

  const handleUpdateLabor = (data: LaborFormValues) => {
    const laborData = {
      ...data,
      availableItems: laborItems,
    };
    updateLaborMutation.mutate(laborData);
  };

  const handleEditBuilding = (building: any) => {
    setEditingBuilding(building);
    buildingForm.reset({
      name: building.name,
      address: building.address || "",
      description: building.description || "",
      roomNumbers: building.roomNumbers || [],
    });
    setBuildingDialogOpen(true);
  };

  const handleEditLabor = (labor: any) => {
    setEditingLabor(labor);
    laborForm.reset({
      name: labor.name,
      description: labor.description || "",
      availableItems: labor.availableItems || [],
    });
    setLaborItems(labor.availableItems || []);
    setLaborDialogOpen(true);
  };

  const addRoom = () => {
    if (newRoom.trim()) {
      const currentRooms = buildingForm.getValues("roomNumbers") || [];
      buildingForm.setValue("roomNumbers", [...currentRooms, newRoom.trim()]);
      setNewRoom("");
    }
  };

  const removeRoom = (index: number) => {
    const currentRooms = buildingForm.getValues("roomNumbers") || [];
    buildingForm.setValue("roomNumbers", currentRooms.filter((_, i) => i !== index));
  };

  const addLaborItem = () => {
    if (newItem.name.trim()) {
      setLaborItems([...laborItems, { ...newItem }]);
      setNewItem({ name: "", description: "", category: "" });
    }
  };

  const removeLaborItem = (index: number) => {
    setLaborItems(laborItems.filter((_, i) => i !== index));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Buildings & Facilities Management</h1>
      </div>

      {/* Organization Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Organization</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedOrganization?.toString() || ""}
            onValueChange={(value) => setSelectedOrganization(parseInt(value))}
          >
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Choose an organization" />
            </SelectTrigger>
            <SelectContent>
              {organizations?.map((org: any) => (
                <SelectItem key={org.id} value={org.id.toString()}>
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedOrganization && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Buildings Management */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Buildings
              </CardTitle>
              <Dialog open={buildingDialogOpen} onOpenChange={setBuildingDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => {
                    setEditingBuilding(null);
                    buildingForm.reset();
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Building
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {editingBuilding ? "Edit Building" : "Add New Building"}
                    </DialogTitle>
                  </DialogHeader>
                  <Form {...buildingForm}>
                    <form onSubmit={buildingForm.handleSubmit(editingBuilding ? handleUpdateBuilding : handleCreateBuilding)} className="space-y-4">
                      <FormField
                        control={buildingForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Building Name</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g., Main Building" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={buildingForm.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Address</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Building address" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={buildingForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea {...field} placeholder="Building description" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Room Numbers Management */}
                      <div>
                        <FormLabel>Room Numbers</FormLabel>
                        <div className="flex gap-2 mt-2">
                          <Input
                            value={newRoom}
                            onChange={(e) => setNewRoom(e.target.value)}
                            placeholder="Add room number"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addRoom();
                              }
                            }}
                          />
                          <Button type="button" onClick={addRoom}>
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {buildingForm.watch("roomNumbers")?.map((room: string, index: number) => (
                            <Badge key={index} variant="secondary" className="flex items-center gap-1">
                              {room}
                              <X 
                                className="h-3 w-3 cursor-pointer" 
                                onClick={() => removeRoom(index)}
                              />
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setBuildingDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit">
                          {editingBuilding ? "Update" : "Create"} Building
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {buildings?.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No buildings configured. Add your first building to get started.
                  </p>
                ) : (
                  buildings?.map((building: any) => (
                    <div key={building.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{building.name}</h3>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditBuilding(building)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteBuildingMutation.mutate(building.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {building.address && (
                        <p className="text-sm text-gray-600 mb-2">{building.address}</p>
                      )}
                      {building.description && (
                        <p className="text-sm text-gray-600 mb-2">{building.description}</p>
                      )}
                      {building.roomNumbers && building.roomNumbers.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Rooms:</p>
                          <div className="flex flex-wrap gap-1">
                            {building.roomNumbers.map((room: string, index: number) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {room}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Facilities Management */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Labors
              </CardTitle>
              <Dialog open={laborDialogOpen} onOpenChange={setLaborDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => {
                    setEditingLabor(null);
                    laborForm.reset();
                    setLaborItems([]);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Labor
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingLabor ? "Edit Labor" : "Add New Labor"}
                    </DialogTitle>
                  </DialogHeader>
                  <Form {...laborForm}>
                    <form onSubmit={laborForm.handleSubmit(editingLabor ? handleUpdateLabor : handleCreateLabor)} className="space-y-4">
                      <FormField
                        control={laborForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Labor Name</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g., AV Equipment" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={laborForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea {...field} placeholder="Labor description" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Available Items Management */}
                      <div>
                        <FormLabel>Available Items</FormLabel>
                        <div className="space-y-2 mt-2">
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              value={newItem.name}
                              onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                              placeholder="Item name"
                            />
                            <Input
                              value={newItem.category}
                              onChange={(e) => setNewItem({...newItem, category: e.target.value})}
                              placeholder="Category"
                            />
                          </div>
                          <Input
                            value={newItem.description}
                            onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                            placeholder="Item description"
                          />
                          <Button type="button" onClick={addLaborItem} className="w-full">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Item
                          </Button>
                        </div>
                        <div className="space-y-2 mt-4">
                          {laborItems.map((item, index) => (
                            <div key={index} className="border rounded p-3 flex justify-between items-start">
                              <div>
                                <div className="font-medium">{item.name}</div>
                                {item.category && (
                                  <Badge variant="outline" className="text-xs mt-1">{item.category}</Badge>
                                )}
                                {item.description && (
                                  <div className="text-sm text-gray-600 mt-1">{item.description}</div>
                                )}
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeLaborItem(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setLaborDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit">
                          {editingLabor ? "Update" : "Create"} Labor
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {labors?.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No labors configured. Add your first labor to get started.
                  </p>
                ) : (
                  labors?.map((labor: any) => (
                    <div key={labor.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{labor.name}</h3>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditLabor(labor)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteLaborMutation.mutate(labor.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {labor.description && (
                        <p className="text-sm text-gray-600 mb-2">{labor.description}</p>
                      )}
                      {labor.availableItems && labor.availableItems.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Available Items:</p>
                          <div className="space-y-1">
                            {labor.availableItems.map((item: any, index: number) => (
                              <div key={index} className="text-sm">
                                <span className="font-medium">{item.name}</span>
                                {item.category && (
                                  <Badge variant="outline" className="ml-2 text-xs">{item.category}</Badge>
                                )}
                                {item.description && (
                                  <div className="text-gray-600 ml-4">{item.description}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}