import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import {
    Check, ChevronDown, ChevronRight, Circle, ListPlus, MoreVertical,
    Plus, Search, Trash2, X, UserPlus, UserMinus
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminWorkTaskAPI, userAPI } from '../../services/api';
import Loader from '../../components/ui/Loader';
import ProfileAvatar from '../../components/ui/ProfileAvatar';


const AdminWorkLists = () => {
    const { role } = useSelector(state => state.auth);
    const isAdmin = role === 'admin';
    const isTeacher = role === 'teacher';
    const canCreate = isAdmin || isTeacher;

    const [lists, setLists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [listTitle, setListTitle] = useState('');
    const [creating, setCreating] = useState(false);
    const [search, setSearch] = useState('');
    const [menuListId, setMenuListId] = useState('');
    const [addingToListId, setAddingToListId] = useState('');
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [expandedTaskId, setExpandedTaskId] = useState('');
    const [completedOpen, setCompletedOpen] = useState({});
    const [drafts, setDrafts] = useState({});
    const [savingId, setSavingId] = useState('');
    const savingRef = useRef('');

    const [shareListId, setShareListId] = useState('');
    const [shareQuery, setShareQuery] = useState('');
    const [shareResults, setShareResults] = useState([]);
    const [shareSearching, setShareSearching] = useState(false);
    const [shareAdding, setShareAdding] = useState('');
    const shareTimerRef = useRef(null);

    const [removeUserId, setRemoveUserId] = useState('');
    const [removingUserId, setRemovingUserId] = useState('');

    const loadLists = async () => {
        try {
            const response = await adminWorkTaskAPI.getAll();
            setLists(response.data.data || []);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lists load nahi ho sake.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadLists();
    }, []);

    const visibleLists = useMemo(() => {
        const query = search.trim().toLowerCase();
        return lists.filter(list => !query
            || list.title?.toLowerCase().includes(query)
            || (list.items || []).some(item => item.title?.toLowerCase().includes(query))
        );
    }, [lists, search]);

    const replaceList = (updatedList) => {
        setLists(current => current.map(list => list._id === updatedList._id ? updatedList : list));
    };

    const createList = async (event) => {
        event.preventDefault();
        const title = listTitle.trim();
        if (!title) return;
        setCreating(true);
        try {
            const response = await adminWorkTaskAPI.create({ title });
            setLists(current => [response.data.data, ...current]);
            setListTitle('');
            setShowCreateModal(false);
            toast.success('List create ho gayi.');
        } catch (error) {
            toast.error(error.response?.data?.message || 'List create nahi ho saki.');
        } finally {
            setCreating(false);
        }
    };

    const renameList = async (list) => {
        const title = window.prompt('List ka naya title:', list.title)?.trim();
        if (!title || title === list.title) return;
        try {
            const response = await adminWorkTaskAPI.update(list._id, { title });
            replaceList(response.data.data);
            setMenuListId('');
        } catch (error) {
            toast.error(error.response?.data?.message || 'List rename nahi ho saki.');
        }
    };

    const deleteList = async (list) => {
        if (!window.confirm(`"${list.title}" aur iske tamam tasks delete karne hain?`)) return;
        try {
            await adminWorkTaskAPI.delete(list._id);
            setLists(current => current.filter(item => item._id !== list._id));
            setMenuListId('');
            toast.success('List delete ho gayi.');
        } catch (error) {
            toast.error(error.response?.data?.message || 'List delete nahi ho saki.');
        }
    };

    const updateListStatus = async (list, status) => {
        const previousStatus = list.status;
        setLists(current => current.map(item => item._id === list._id ? { ...item, status } : item));
        try {
            const response = await adminWorkTaskAPI.update(list._id, { status });
            replaceList(response.data.data);
        } catch (error) {
            setLists(current => current.map(item => item._id === list._id ? { ...item, status: previousStatus } : item));
            toast.error(error.response?.data?.message || 'List status update nahi ho saka.');
        }
    };

    const openAddTask = (listId) => {
        setAddingToListId(listId);
        setNewTaskTitle('');
        setMenuListId('');
    };

    const createTask = async (event, listId) => {
        event.preventDefault();
        const title = newTaskTitle.trim();
        if (!title) return;
        setSavingId(`new-${listId}`);
        try {
            const response = await adminWorkTaskAPI.createItem(listId, { title });
            replaceList(response.data.data);
            setNewTaskTitle('');
            setAddingToListId('');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Task add nahi ho saka.');
        } finally {
            setSavingId('');
        }
    };

    const getDraft = (item) => drafts[item._id] || {
        description: item.description || '',
        status: item.status || 'pending'
    };

    const updateDraft = (item, changes) => {
        setDrafts(current => ({
            ...current,
            [item._id]: { ...getDraft(item), ...changes }
        }));
    };

    const updateTask = async (list, item, changes) => {
        const key = `${list._id}-${item._id}`;
        if (savingRef.current === key) return;
        savingRef.current = key;
        setSavingId(item._id);
        try {
            const response = await adminWorkTaskAPI.updateItem(list._id, item._id, changes);
            replaceList(response.data.data);
            setDrafts(current => {
                const next = { ...current };
                delete next[item._id];
                return next;
            });
        } catch (error) {
            toast.error(error.response?.data?.message || 'Task update nahi ho saka.');
        } finally {
            savingRef.current = '';
            setSavingId('');
        }
    };

    const toggleTask = (list, item) => {
        updateTask(list, item, {
            status: item.status === 'completed' ? 'pending' : 'completed'
        });
    };

    const deleteTask = async (list, item) => {
        if (!window.confirm(`"${item.title}" delete karna hai?`)) return;
        try {
            const response = await adminWorkTaskAPI.deleteItem(list._id, item._id);
            replaceList(response.data.data);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Task delete nahi ho saka.');
        }
    };

    const openShareModal = (listId) => {
        setShareListId(listId);
        setShareQuery('');
        setShareResults([]);
        setMenuListId('');
    };

    const searchUsersForShare = useCallback((query) => {
        setShareQuery(query);
        if (shareTimerRef.current) clearTimeout(shareTimerRef.current);
        if (!query.trim()) { setShareResults([]); return; }
        shareTimerRef.current = setTimeout(async () => {
            setShareSearching(true);
            try {
                const response = await userAPI.search(query.trim(), 'teacher');
                setShareResults(response.data.data || []);
            } catch {
                setShareResults([]);
            } finally {
                setShareSearching(false);
            }
        }, 300);
    }, []);

    const addUserToList = async (userId) => {
        if (!shareListId) return;
        setShareAdding(userId);
        try {
            const response = await adminWorkTaskAPI.share(shareListId, userId);
            replaceList(response.data.data);
            toast.success('User add ho gaya.');
            setShareResults(current => current.filter(u => u._id !== userId));
        } catch (error) {
            toast.error(error.response?.data?.message || 'User add nahi ho saka.');
        } finally {
            setShareAdding('');
        }
    };

    const closeShareModal = () => {
        setShareListId('');
        setShareQuery('');
        setShareResults([]);
    };

    const openRemoveUserModal = (listId) => {
        setRemoveUserId(listId);
        setMenuListId('');
    };

    const removeUserFromList = async (listId, userId) => {
        setRemovingUserId(userId);
        try {
            const response = await adminWorkTaskAPI.unshare(listId, userId);
            replaceList(response.data.data);
            toast.success('User remove ho gaya.');
        } catch (error) {
            toast.error(error.response?.data?.message || 'User remove nahi ho saka.');
        } finally {
            setRemovingUserId('');
        }
    };

    const closeRemoveUserModal = () => {
        setRemoveUserId('');
    };

    if (loading) return <Loader message="Loading work lists..." />;

    return (
        <div className="min-h-full bg-gray-50/60 p-4 dark:bg-transparent sm:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl">

                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">{isAdmin ? 'Shared Work Lists' : 'My Work Lists'}</p>
                        <h1 className="mt-1 text-2xl font-black text-gray-900 dark:text-white sm:text-3xl">Daily Work Lists</h1>
                        <p className="mt-1 text-sm text-gray-500 dark:text-white/50">{isAdmin ? 'Lists manage karein aur users ko share karein.' : 'Apni lists banayein aur team ke sath share karein.'}</p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search..." className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-primary dark:border-white/10 dark:bg-white/5 dark:text-white sm:w-56" />
                        </div>
                        {canCreate && <button onClick={() => { setListTitle(''); setShowCreateModal(true); }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-black text-white shadow-lg shadow-primary/20">
                            <ListPlus className="h-5 w-5" /> Create List
                        </button>}
                    </div>
                </div>

                {visibleLists.length === 0 ? (
                    <div className="rounded-3xl border-2 border-dashed border-gray-200 bg-white py-20 text-center dark:border-white/10 dark:bg-white/5">
                        <ListPlus className="mx-auto h-14 w-14 text-gray-300" />
                        <h2 className="mt-4 font-black text-gray-700 dark:text-white">Abhi koi list nahi hai</h2>
                        <p className="mt-1 text-sm text-gray-400">{canCreate ? 'Create List press karke pehli list banayein.' : 'Admin aapke sath koi list share karega.'}</p>
                    </div>
                ) : (
                    <div className="grid items-start gap-5 md:grid-cols-2 xl:grid-cols-3">
                        {visibleLists.map(list => {
                            const activeItems = (list.items || []).filter(item => item.status !== 'completed');
                            const completedItems = (list.items || []).filter(item => item.status === 'completed');
                            const isCompletedOpen = Boolean(completedOpen[list._id]);
                            const canManage = isAdmin || list.isOwner;

                            return (
                                <section key={list._id} className="relative overflow-visible rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#141418]">
                                    <div className="mb-5 flex items-center justify-between gap-3">
                                        <h2 className="min-w-0 truncate text-xl font-bold text-gray-900 dark:text-white">{list.title}</h2>
                                        {canManage && <div className="relative">
                                            <button onClick={() => setMenuListId(menuListId === list._id ? '' : list._id)} className="rounded-full p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10">
                                                <MoreVertical className="h-5 w-5" />
                                            </button>
                                            {menuListId === list._id && (
                                                <div className="absolute right-0 top-10 z-30 w-44 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-xl dark:border-white/10 dark:bg-gray-900">
                                                    <button onClick={() => renameList(list)} className="w-full px-4 py-2.5 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:text-white/80 dark:hover:bg-white/5">Rename list</button>
                                                    <button onClick={() => openShareModal(list._id)} className="w-full px-4 py-2.5 text-left text-sm font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10">Add user</button>
                                                    {list.sharedWith && list.sharedWith.length > 0 && <button onClick={() => openRemoveUserModal(list._id)} className="w-full px-4 py-2.5 text-left text-sm font-semibold text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-500/10">Remove user</button>}
                                                    <button onClick={() => deleteList(list)} className="w-full px-4 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10">Delete list</button>
                                                </div>
                                            )}
                                        </div>}
                                    </div>

                                    {list.sharedWith && list.sharedWith.length > 0 && (
                                        <div className="-mt-3 mb-4 flex flex-wrap gap-1.5">
                                            {list.sharedWith.map(member => (
                                                <span key={member._id || member} className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                                                    <ProfileAvatar src={member.photo} name={member.name || 'User'} size="xs" border="border border-primary/30" />
                                                    {member.name || 'User'} · #{member.rollNo || '?'}
                                                    {canManage && (
                                                        <button onClick={() => removeUserFromList(list._id, member._id || member)} disabled={removingUserId === (member._id || member)} className="ml-0.5 rounded-full p-0.5 text-primary/60 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-50">
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    )}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    <button onClick={() => openAddTask(list._id)} className="mb-3 flex items-center gap-3 text-sm font-bold text-blue-600 hover:text-blue-700">
                                        <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-blue-500"><Plus className="h-4 w-4" /></span>
                                        Add a task
                                    </button>

                                    {addingToListId === list._id && (
                                        <form onSubmit={event => createTask(event, list._id)} className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-500/20 dark:bg-blue-500/10">
                                            <input autoFocus required maxLength={200} value={newTaskTitle} onChange={event => setNewTaskTitle(event.target.value)} placeholder="Task title..." className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-blue-500 dark:border-white/10 dark:bg-black/30 dark:text-white" />
                                            <div className="mt-2 flex justify-end gap-2">
                                                <button type="button" onClick={() => setAddingToListId('')} className="px-3 py-2 text-xs font-bold text-gray-500">Cancel</button>
                                                <button disabled={savingId === `new-${list._id}`} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-black text-white disabled:opacity-50">Add task</button>
                                            </div>
                                        </form>
                                    )}

                                    <div className="space-y-2">
                                        {activeItems.length === 0 && addingToListId !== list._id && (
                                            <p className="py-3 text-center text-xs text-gray-400">No active tasks</p>
                                        )}
                                        {activeItems.map(item => {
                                            const draft = getDraft(item);
                                            const expanded = expandedTaskId === item._id;
                                            return (
                                                <div key={item._id} className="rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.03]">
                                                    <div className="flex items-center gap-2 px-1 py-2">
                                                        <button onClick={() => toggleTask(list, item)} className="mt-0.5 h-5 w-5 shrink-0 text-gray-500 hover:text-blue-600">
                                                            <Circle className="h-5 w-5" />
                                                        </button>
                                                        <button onClick={() => setExpandedTaskId(expanded ? '' : item._id)} className="min-w-0 flex-1 text-left">
                                                            <p className="break-words text-sm font-medium text-gray-800 dark:text-white/90">{item.title}</p>
                                                            {item.description && !expanded && <p className="mt-0.5 truncate text-xs text-gray-400">{item.description}</p>}
                                                            {item.createdBy && (
                                                                <div className="mt-1 flex items-center gap-1.5">
                                                                    <ProfileAvatar src={item.createdBy.photo} name={item.createdBy.name || 'User'} size="xs" border="border border-gray-200 dark:border-white/10" />
                                                                    <span className="text-[10px] text-gray-400">{item.createdBy.name || 'User'} · #{item.createdBy.rollNo || '?'}</span>
                                                                </div>
                                                            )}
                                                        </button>
                                                        <button onClick={() => setExpandedTaskId(expanded ? '' : item._id)} className="rounded p-1 text-gray-400">
                                                            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                        </button>
                                                    </div>
                                                    {expanded && (
                                                        <div className="ml-8 space-y-2 border-l-2 border-gray-100 pb-3 pl-3 dark:border-white/10">
                                                            {item.canEdit ? (
                                                                <textarea rows={3} value={draft.description} onChange={event => updateDraft(item, { description: event.target.value })} placeholder="Description / notes..." className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-xs outline-none focus:border-primary dark:border-white/10 dark:bg-black/20 dark:text-white" />
                                                            ) : item.description ? (
                                                                <p className="rounded-lg bg-gray-50 p-2.5 text-xs text-gray-600 dark:bg-black/20 dark:text-white/70">{item.description}</p>
                                                            ) : null}
                                                            <div className="flex justify-end gap-2">
                                                                {item.canDelete && <button onClick={() => deleteTask(list, item)} className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"><Trash2 className="h-4 w-4" /></button>}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <button onClick={() => setCompletedOpen(current => ({ ...current, [list._id]: !current[list._id] }))} className="mt-4 flex w-full items-center gap-2 border-t border-gray-100 pt-4 text-left text-sm font-bold text-gray-700 dark:border-white/10 dark:text-white/80">
                                        {isCompletedOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                        Completed ({completedItems.length})
                                    </button>

                                    {isCompletedOpen && (
                                        <div className="mt-2 space-y-1">
                                            {completedItems.length === 0 ? (
                                                <p className="py-2 pl-6 text-xs text-gray-400">No completed tasks</p>
                                            ) : completedItems.map(item => (
                                                <div key={item._id} className="flex items-start gap-3 rounded-lg px-1 py-2 opacity-50">
                                                    <button onClick={() => toggleTask(list, item)} className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                                                        <Check className="h-3.5 w-3.5" strokeWidth={4} />
                                                    </button>
                                                    <p className="min-w-0 flex-1 break-words text-sm text-gray-600 line-through dark:text-white/60">{item.title}</p>
                                                    {item.canDelete && <button onClick={() => deleteTask(list, item)} className="rounded p-1 text-gray-400 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </section>
                            );
                        })}
                    </div>
                )}
            </div>

            {showCreateModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onMouseDown={() => setShowCreateModal(false)}>
                    <form onSubmit={createList} onMouseDown={event => event.stopPropagation()} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-gray-900">
                        <div className="mb-5 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">New List</p>
                                <h2 className="mt-1 text-xl font-black text-gray-900 dark:text-white">List ka title dein</h2>
                            </div>
                            <button type="button" onClick={() => setShowCreateModal(false)} className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"><X className="h-5 w-5" /></button>
                        </div>
                        <input autoFocus required maxLength={200} value={listTitle} onChange={event => setListTitle(event.target.value)} placeholder="Example: CEO Tasks" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 dark:border-white/10 dark:bg-black/20 dark:text-white" />
                        {isTeacher && <p className="mt-3 text-xs text-gray-400 dark:text-white/40">Admin automatically is list mein add ho jayega. Baad mein "Add user" se aur teachers ko add kar sakte hain.</p>}
                        <div className="mt-5 flex justify-end gap-3">
                            <button type="button" onClick={() => setShowCreateModal(false)} className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-bold text-gray-600 dark:border-white/10 dark:text-white/70">Cancel</button>
                            <button disabled={creating} className="rounded-xl bg-primary px-5 py-3 text-sm font-black text-white disabled:opacity-60">{creating ? 'Creating...' : 'Create List'}</button>
                        </div>
                    </form>
                </div>
            )}

            {shareListId && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onMouseDown={closeShareModal}>
                    <div onMouseDown={event => event.stopPropagation()} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-gray-900">
                        <div className="mb-5 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Add User</p>
                                <h2 className="mt-1 text-xl font-black text-gray-900 dark:text-white">User ko list mein add karein</h2>
                            </div>
                            <button onClick={closeShareModal} className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <input autoFocus value={shareQuery} onChange={event => searchUsersForShare(event.target.value)} placeholder="Roll number, name ya email likhein..." className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-white/10 dark:bg-black/20 dark:text-white" />
                        </div>
                        <div className="mt-3 max-h-64 overflow-y-auto">
                            {shareSearching && <p className="py-4 text-center text-sm text-gray-400">Searching...</p>}
                            {!shareSearching && shareQuery && shareResults.length === 0 && (
                                <p className="py-4 text-center text-sm text-gray-400">Koi user nahi mila.</p>
                            )}
                            {shareResults.map(user => (
                                <button key={user._id} onClick={() => addUserToList(user._id)} disabled={shareAdding === user._id} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50">
                                    <ProfileAvatar src={user.photo} name={user.name || 'User'} size="sm" border="border border-primary/30" />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-bold text-gray-900 dark:text-white">{user.name}</p>
                                        <p className="truncate text-xs text-gray-400">#{user.rollNo || '?'} · {user.role}</p>
                                    </div>
                                    {shareAdding === user._id ? (
                                        <span className="text-xs text-blue-600">Adding...</span>
                                    ) : (
                                        <UserPlus className="h-4 w-4 shrink-0 text-gray-400" />
                                    )}
                                </button>
                            ))}
                        </div>
                        <div className="mt-4 flex justify-end">
                            <button onClick={closeShareModal} className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-bold text-gray-600 dark:border-white/10 dark:text-white/70">Done</button>
                        </div>
                    </div>
                </div>
            )}

            {removeUserId && (() => {
                const list = lists.find(l => l._id === removeUserId);
                const members = list?.sharedWith || [];
                return (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onMouseDown={closeRemoveUserModal}>
                        <div onMouseDown={event => event.stopPropagation()} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-gray-900">
                            <div className="mb-5 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-600">Remove User</p>
                                    <h2 className="mt-1 text-xl font-black text-gray-900 dark:text-white">List se user remove karein</h2>
                                </div>
                                <button onClick={closeRemoveUserModal} className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"><X className="h-5 w-5" /></button>
                            </div>
                            <div className="max-h-64 overflow-y-auto">
                                {members.length === 0 ? (
                                    <p className="py-4 text-center text-sm text-gray-400">Koi user share nahi hai.</p>
                                ) : members.map(member => (
                                    <button key={member._id || member} onClick={() => removeUserFromList(removeUserId, member._id || member)} disabled={removingUserId === (member._id || member)} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-50">
                                        <ProfileAvatar src={member.photo} name={member.name || 'User'} size="sm" border="border border-primary/30" />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-bold text-gray-900 dark:text-white">{member.name || 'User'}</p>
                                            <p className="truncate text-xs text-gray-400">#{member.rollNo || '?'} · {member.role}</p>
                                        </div>
                                        {removingUserId === (member._id || member) ? (
                                            <span className="text-xs text-red-600">Removing...</span>
                                        ) : (
                                            <UserMinus className="h-4 w-4 shrink-0 text-red-400" />
                                        )}
                                    </button>
                                ))}
                            </div>
                            <div className="mt-4 flex justify-end">
                                <button onClick={closeRemoveUserModal} className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-bold text-gray-600 dark:border-white/10 dark:text-white/70">Done</button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default AdminWorkLists;
