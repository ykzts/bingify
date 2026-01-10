"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
	label: string;
	value: string;
}

interface ComboboxProps {
	className?: string;
	disabled?: boolean;
	emptyText?: string;
	onValueChange?: (value: string) => void;
	options: ComboboxOption[];
	placeholder?: string;
	searchPlaceholder?: string;
	value?: string;
}

export function Combobox({
	className,
	disabled = false,
	emptyText = "No option found.",
	onValueChange,
	options,
	placeholder = "Select option...",
	searchPlaceholder = "Search...",
	value,
}: ComboboxProps) {
	const [open, setOpen] = React.useState(false);

	const selectedOption = options.find((option) => option.value === value);

	return (
		<Popover onOpenChange={setOpen} open={open}>
			<PopoverTrigger asChild>
				<Button
					aria-expanded={open}
					className={cn("w-full justify-between", className)}
					disabled={disabled}
					role="combobox"
					variant="outline"
				>
					{selectedOption ? selectedOption.label : placeholder}
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-0">
				<Command>
					<CommandInput placeholder={searchPlaceholder} />
					<CommandList>
						<CommandEmpty>{emptyText}</CommandEmpty>
						<CommandGroup>
							{options.map((option) => (
								<CommandItem
									key={option.value}
									keywords={[option.label]}
									onSelect={() => {
										onValueChange?.(option.value);
										setOpen(false);
									}}
									value={option.value}
								>
									<Check
										className={cn(
											"mr-2 h-4 w-4",
											value === option.value ? "opacity-100" : "opacity-0",
										)}
									/>
									{option.label}
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
